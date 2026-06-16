// db helpers
function dbSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dbGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}

function dbDel(key) {
  localStorage.removeItem(key);
}

let currentUser = null;

// auth
function switchAuth(mode) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const btns         = document.querySelectorAll('.tab-btn');

  if (mode === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    btns[0].classList.add('active');
    btns[1].classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    btns[0].classList.remove('active');
    btns[1].classList.add('active');
  }
  document.getElementById('auth-msg').innerHTML = '';
}

function showAuthMsg(text, type) {
  document.getElementById('auth-msg').innerHTML = `<div class="msg ${type}">${text}</div>`;
}

function register() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;

  if (!name || !email || !pass) return showAuthMsg('Please fill in all fields', 'error');
  if (pass.length < 6) return showAuthMsg('Password must be at least 6 characters', 'error');

  const users = dbGet('rf_users') || {};
  if (users[email]) return showAuthMsg('This email is already registered', 'error');

  users[email] = { name, email, pass, createdAt: new Date().toISOString(), aiChats: 0, uni: '', major: '', year: '3rd year', bio: '' };
  dbSet('rf_users', users);

  showAuthMsg('Account created! You can now sign in.', 'success');
  switchAuth('login');
  document.getElementById('login-email').value = email;
}

function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;

  if (!email || !pass) return showAuthMsg('Please enter email and password', 'error');

  const users = dbGet('rf_users') || {};
  if (!users[email] || users[email].pass !== pass) return showAuthMsg('Invalid email or password', 'error');

  currentUser = users[email];
  dbSet('rf_current', email);
  initApp();
}

function logout() {
  currentUser = null;
  dbDel('rf_current');
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

// auto login
window.addEventListener('load', () => {
  const saved = dbGet('rf_current');
  if (saved) {
    const users = dbGet('rf_users') || {};
    if (users[saved]) { currentUser = users[saved]; initApp(); }
  }
});

// init app
function initApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('nav-avatar').textContent      = initials;
  document.getElementById('dash-name').textContent       = currentUser.name.split(' ')[0];
  document.getElementById('profile-avatar').textContent  = initials;
  document.getElementById('profile-name').textContent    = currentUser.name;
  document.getElementById('profile-email').textContent   = currentUser.email;
  document.getElementById('set-name').value  = currentUser.name;
  document.getElementById('set-uni').value   = currentUser.uni   || '';
  document.getElementById('set-major').value = currentUser.major || '';
  document.getElementById('set-bio').value   = currentUser.bio   || '';

  updateDashboard();
}

// pages
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');

  if (id === 'builder')   { renderResumeGrid(); backToList(); }
  if (id === 'feedback')  loadFeedbackPage();
  if (id === 'profile')   loadProfileStats();
  if (id === 'dashboard') updateDashboard();
}

// dashboard
function updateDashboard() {
  const resumes    = getMyResumes();
  const allFb      = dbGet('rf_feedback') || [];
  const myFeedback = allFb.filter(f => f.toUser === currentUser.email);

  document.getElementById('stat-resumes').textContent  = resumes.length;
  document.getElementById('stat-feedback').textContent = myFeedback.length;
  document.getElementById('stat-ai').textContent       = currentUser.aiChats || 0;

  const recent = document.getElementById('dash-recent');
  if (resumes.length === 0) {
    recent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <p>No resumes yet. Create your first one!</p>
      </div>`;
    return;
  }

  recent.innerHTML = resumes.slice(-3).reverse().map(r => `
    <div class="resume-card" style="margin-bottom:12px;">
      <div class="badge">Resume</div>
      <div class="resume-card-title">${r.title || 'Untitled Resume'}</div>
      <div class="resume-card-date">Updated: ${new Date(r.updatedAt).toLocaleDateString()}</div>
      <div class="resume-card-actions">
        <button class="btn sm" onclick="showPage('builder', null); editResume('${r.id}')">Edit</button>
      </div>
    </div>`).join('');
}

// resume builder
let currentResumeId = null;
const resumeFields = ['name','title','email','phone','location','link','summary','uni','degree','years','gpa','job1','job1-dates','job1-desc','skills','langs','certs'];

function getMyResumes() {
  const all = dbGet('rf_resumes') || [];
  return all.filter(r => r.owner === currentUser.email);
}

function renderResumeGrid() {
  const mine = getMyResumes();
  const grid = document.getElementById('resume-grid');

  grid.innerHTML = mine.map(r => `
    <div class="resume-card">
      <div class="badge">Resume</div>
      <div class="resume-card-title">${r.title || 'Untitled Resume'}</div>
      <div class="resume-card-date">Updated: ${new Date(r.updatedAt).toLocaleDateString()}</div>
      <div class="resume-card-actions">
        <button class="btn sm" onclick="editResume('${r.id}')">Edit</button>
        <button class="btn sm danger" onclick="deleteResume('${r.id}')">Delete</button>
      </div>
    </div>`).join('') +
    `<div class="add-card" onclick="openNewResume()">
       <div class="plus">+</div>
       <div>New Resume</div>
     </div>`;
}

function openNewResume() {
  currentResumeId = 'r_' + Date.now();
  document.getElementById('editor-title').textContent = 'New Resume';
  resumeFields.forEach(f => {
    const el = document.getElementById('e-' + f);
    if (el) el.value = '';
  });
  updatePreview();
  document.getElementById('builder-list-view').classList.add('hidden');
  document.getElementById('builder-editor-view').classList.remove('hidden');
}

function editResume(id) {
  const all = dbGet('rf_resumes') || [];
  const r   = all.find(x => x.id === id);
  if (!r) return;

  currentResumeId = id;
  document.getElementById('editor-title').textContent = r.title || 'Edit Resume';
  resumeFields.forEach(f => {
    const el = document.getElementById('e-' + f);
    if (el) el.value = r.data[f] || '';
  });
  updatePreview();
  document.getElementById('builder-list-view').classList.add('hidden');
  document.getElementById('builder-editor-view').classList.remove('hidden');
}

function backToList() {
  document.getElementById('builder-list-view').classList.remove('hidden');
  document.getElementById('builder-editor-view').classList.add('hidden');
  renderResumeGrid();
}

function saveResume() {
  const data = {};
  resumeFields.forEach(f => {
    const el = document.getElementById('e-' + f);
    if (el) data[f] = el.value;
  });

  const all   = dbGet('rf_resumes') || [];
  const idx   = all.findIndex(r => r.id === currentResumeId);
  const entry = {
    id: currentResumeId,
    owner: currentUser.email,
    title: data.name ? data.name + "'s Resume" : 'Untitled Resume',
    data,
    updatedAt: new Date().toISOString(),
    shared: idx >= 0 ? all[idx].shared : false
  };

  if (idx >= 0) all[idx] = entry;
  else all.push(entry);

  dbSet('rf_resumes', all);
  alert('Resume saved successfully!');
  updateDashboard();
}

function deleteResume(id) {
  if (!confirm('Delete this resume?')) return;
  let all = dbGet('rf_resumes') || [];
  all = all.filter(r => r.id !== id);
  dbSet('rf_resumes', all);
  renderResumeGrid();
  updateDashboard();
}

function shareResume() {
  if (!currentResumeId) return alert('Save your resume first!');
  const all = dbGet('rf_resumes') || [];
  const idx = all.findIndex(r => r.id === currentResumeId);
  if (idx < 0) return alert('Save your resume first!');
  all[idx].shared = true;
  dbSet('rf_resumes', all);
  alert('Resume shared! Others can now give you feedback.');
}

function updatePreview() {
  const g = id => document.getElementById('e-' + id)?.value?.trim() || '';
  const name = g('name');

  if (!name) {
    document.getElementById('resume-preview').innerHTML =
      '<p style="color:#aaa; text-align:center; padding:40px 0;">Start filling in the form to see preview</p>';
    return;
  }

  const skillTags = g('skills')
    ? g('skills').split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')
    : '';

  document.getElementById('resume-preview').innerHTML = `
    <div class="preview-name">${name}</div>
    ${g('title') ? `<div class="preview-jobtitle">${g('title')}</div>` : ''}
    <div class="preview-contact">${[g('email'), g('phone'), g('location'), g('link')].filter(Boolean).join(' · ')}</div>
    ${g('summary') ? `<div class="preview-section"><h3>Summary</h3><p>${g('summary')}</p></div>` : ''}
    ${g('uni') || g('degree') ? `
      <div class="preview-section"><h3>Education</h3>
        <p><strong>${g('uni')}</strong>${g('degree') ? ' — ' + g('degree') : ''}${g('years') ? ', ' + g('years') : ''}${g('gpa') ? ' · GPA: ' + g('gpa') : ''}</p>
      </div>` : ''}
    ${g('job1') ? `
      <div class="preview-section"><h3>Work Experience</h3>
        <p><strong>${g('job1')}</strong>${g('job1-dates') ? ' · ' + g('job1-dates') : ''}</p>
        ${g('job1-desc') ? `<p style="margin-top:4px;">${g('job1-desc')}</p>` : ''}
      </div>` : ''}
    ${g('skills') ? `<div class="preview-section"><h3>Skills</h3><div class="skills-tags">${skillTags}</div></div>` : ''}
    ${g('langs')  ? `<div class="preview-section"><h3>Languages</h3><p>${g('langs')}</p></div>` : ''}
    ${g('certs')  ? `<div class="preview-section"><h3>Certifications</h3><p>${g('certs')}</p></div>` : ''}
  `;
}

// ai assistant
const SYSTEM_PROMPT = `You are ResumeFlow AI, an expert resume coach helping students and early-career professionals in Kazakhstan create strong resumes. Give specific, actionable advice. Be encouraging but honest. Keep responses under 200 words and easy to understand.`;

let chatHistory = [];

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendChat(msg, 'user');
  chatHistory.push({ role: 'user', content: msg });

  const btn = document.getElementById('send-btn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const thinking = appendChat('Thinking...', 'ai');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: chatHistory
      })
    });

    const data  = await res.json();
    const reply = data.content?.[0]?.text || 'Sorry, something went wrong. Please try again.';

    thinking.remove();
    appendChat(reply, 'ai');
    chatHistory.push({ role: 'assistant', content: reply });

    const users = dbGet('rf_users') || {};
    users[currentUser.email].aiChats = (users[currentUser.email].aiChats || 0) + 1;
    currentUser.aiChats = users[currentUser.email].aiChats;
    dbSet('rf_users', users);
    document.getElementById('stat-ai').textContent = currentUser.aiChats;

  } catch (e) {
    thinking.remove();
    appendChat('Connection error. Check your internet and try again.', 'ai');
  }

  btn.disabled  = false;
  btn.innerHTML = 'Send';
}

function appendChat(text, role) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  if (role === 'ai') {
    div.innerHTML = `<div class="sender">✨ ResumeFlow AI</div>${text}`;
  } else {
    div.textContent = text;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function setPrompt(text) {
  document.getElementById('chat-input').value = text;
  document.getElementById('chat-input').focus();
}

// feedback
function loadFeedbackPage() {
  const allResumes   = dbGet('rf_resumes') || [];
  const shared       = allResumes.filter(r => r.shared);
  const allFb        = dbGet('rf_feedback') || [];
  const othersShared = shared.filter(r => r.owner !== currentUser.email);

  const select = document.getElementById('feedback-resume-select');
  select.innerHTML = '<option value="">— Choose a shared resume —</option>' +
    othersShared.map(r => `<option value="${r.id}">${r.data?.name || 'User'}'s Resume</option>`).join('');

  const myShared = shared.filter(r => r.owner === currentUser.email);
  const list     = document.getElementById('shared-resumes-list');

  if (myShared.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📤</div>
        <p>No shared resumes yet.<br/>Go to My Resumes → click "Share for Feedback"</p>
      </div>`;
  } else {
    list.innerHTML = myShared.map(r => {
      const fb = allFb.filter(f => f.resumeId === r.id);
      return `
        <div class="feedback-card">
          <div class="resume-card-title">${r.title || 'Untitled Resume'}</div>
          <div class="resume-card-date" style="margin-bottom:${fb.length ? '12px' : '0'};">
            Shared · ${fb.length} feedback(s) received
          </div>
          ${fb.map(f => `
            <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:8px;">
              <div class="feedback-card-header">
                <div class="feedback-avatar">${f.fromName[0].toUpperCase()}</div>
                <div>
                  <div class="feedback-user">${f.fromName}</div>
                  <div class="feedback-date">${new Date(f.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div class="stars">${'⭐'.repeat(f.rating)}</div>
              <div class="feedback-section-tag">${f.section}</div>
              <div class="feedback-text" style="margin-top:6px;">${f.text}</div>
            </div>`).join('')}
        </div>`;
    }).join('');
  }
}

function submitFeedback() {
  const resumeId = document.getElementById('feedback-resume-select').value;
  const section  = document.getElementById('feedback-section').value;
  const rating   = parseInt(document.getElementById('feedback-rating').value);
  const text     = document.getElementById('feedback-text').value.trim();
  const msgEl    = document.getElementById('feedback-msg');

  if (!resumeId) { msgEl.innerHTML = '<div class="msg error">Please select a resume to review</div>'; return; }
  if (text.length < 20) { msgEl.innerHTML = '<div class="msg error">Please write at least 20 characters</div>'; return; }

  const allResumes = dbGet('rf_resumes') || [];
  const resume     = allResumes.find(r => r.id === resumeId);
  if (!resume) return;

  const allFb = dbGet('rf_feedback') || [];
  allFb.push({
    id: 'fb_' + Date.now(),
    resumeId,
    toUser:   resume.owner,
    fromUser: currentUser.email,
    fromName: currentUser.name,
    section,
    rating,
    text,
    createdAt: new Date().toISOString()
  });
  dbSet('rf_feedback', allFb);

  document.getElementById('feedback-text').value = '';
  document.getElementById('feedback-resume-select').value = '';
  msgEl.innerHTML = '<div class="msg success">Feedback submitted successfully!</div>';
  setTimeout(() => { msgEl.innerHTML = ''; }, 3000);

  loadFeedbackPage();
  updateDashboard();
}

// profile
function saveProfile() {
  const name  = document.getElementById('set-name').value.trim();
  const uni   = document.getElementById('set-uni').value.trim();
  const major = document.getElementById('set-major').value.trim();
  const year  = document.getElementById('set-year').value;
  const bio   = document.getElementById('set-bio').value.trim();
  const msgEl = document.getElementById('profile-msg');

  if (!name) { msgEl.innerHTML = '<div class="msg error">Name cannot be empty</div>'; return; }

  const users = dbGet('rf_users') || {};
  users[currentUser.email] = { ...users[currentUser.email], name, uni, major, year, bio };
  currentUser = users[currentUser.email];
  dbSet('rf_users', users);

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent   = name;
  document.getElementById('nav-avatar').textContent     = initials;
  document.getElementById('dash-name').textContent      = name.split(' ')[0];

  msgEl.innerHTML = '<div class="msg success">Profile updated successfully!</div>';
  setTimeout(() => { msgEl.innerHTML = ''; }, 3000);
}

function loadProfileStats() {
  const resumes  = getMyResumes();
  const allFb    = dbGet('rf_feedback') || [];
  const given    = allFb.filter(f => f.fromUser === currentUser.email).length;
  const received = allFb.filter(f => f.toUser === currentUser.email).length;

  document.getElementById('ps-resumes').textContent  = resumes.length;
  document.getElementById('ps-given').textContent    = given;
  document.getElementById('ps-received').textContent = received;
  document.getElementById('ps-ai').textContent       = currentUser.aiChats || 0;
}