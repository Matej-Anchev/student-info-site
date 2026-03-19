// Admin functionality for Student Info Site
// Uses localStorage for data persistence and stores only password hash.

const STORAGE_KEY = 'bulletin_items';
const AUTH_KEY = 'admin_session';
const ADMIN_HASH_KEY = 'admin_password_hash';
const FIRST_VISIT_KEY = 'student_info_first_visit';

function loadBulletinItems() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveBulletinItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function categoryLabel(category) {
  if (category === 'urgent') return 'Итно';
  if (category === 'event') return 'Настан';
  return 'Ажурирање';
}

async function sha256(input) {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isAdminAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'authenticated';
}

function show(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = '';
}

function hide(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = 'none';
}

function renderBulletinItemsInAdmin() {
  const itemsList = document.getElementById('bulletin-items-list');
  if (!itemsList) return;

  const items = loadBulletinItems();
  itemsList.innerHTML = '';

  if (items.length === 0) {
    itemsList.innerHTML = '<p class="text-muted">Нема соопштенија. Додадете прво соопштение.</p>';
    return;
  }

  items.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'card mb-3';
    itemEl.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h5 class="mb-1">${escapeHtml(item.title)}</h5>
            <small class="text-muted">${item.date}</small>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-warning btn-sm" onclick="editBulletinItem(${index})">Измени</button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteBulletinItem(${index})">Избриши</button>
          </div>
        </div>
        <p>${escapeHtml(item.description)}</p>
        <span class="tag ${
          item.category === 'urgent' ? 'danger' : item.category === 'event' ? 'brand' : 'accent'
        }">${categoryLabel(item.category)}</span>
      </div>
    `;
    itemsList.appendChild(itemEl);
  });
}

function refreshPublicBulletinBoard() {
  const bulletinBoard = document.getElementById('dynamic-bulletin-board');
  if (!bulletinBoard) return;

  const items = loadBulletinItems();
  bulletinBoard.innerHTML = '';

  if (items.length === 0) {
    bulletinBoard.innerHTML = '<p class="text-muted">Моментално нема нови соопштенија.</p>';
    return;
  }

  items.slice(0, 5).forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'bulletin-item';
    itemEl.innerHTML = `
      <span class="bulletin-date">${item.date}</span>
      <div class="bulletin-title">${escapeHtml(item.title)}</div>
      <p class="bulletin-desc">${escapeHtml(item.description)}</p>
      <span class="tag ${
        item.category === 'urgent' ? 'danger' : item.category === 'event' ? 'brand' : 'accent'
      }">${categoryLabel(item.category)}</span>
    `;
    bulletinBoard.appendChild(itemEl);
  });
}

function addNewBulletinItem(event) {
  event.preventDefault();
  const title = document.getElementById('bulletin-title').value.trim();
  const description = document.getElementById('bulletin-description').value.trim();
  const category = document.getElementById('bulletin-category').value;

  if (!title || !description) {
    alert('Пополнете ги сите полиња.');
    return;
  }

  const items = loadBulletinItems();
  const date = new Date().toLocaleDateString('mk-MK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  items.unshift({ title, description, category, date });
  saveBulletinItems(items);

  document.getElementById('bulletin-title').value = '';
  document.getElementById('bulletin-description').value = '';
  document.getElementById('bulletin-category').value = 'update';

  renderBulletinItemsInAdmin();
  refreshPublicBulletinBoard();
  alert('Соопштението е додадено.');
}

function editBulletinItem(index) {
  const items = loadBulletinItems();
  const item = items[index];

  const title = prompt('Наслов:', item.title);
  if (title === null) return;

  const description = prompt('Опис:', item.description);
  if (description === null) return;

  items[index] = {
    ...item,
    title: title.trim(),
    description: description.trim()
  };

  saveBulletinItems(items);
  renderBulletinItemsInAdmin();
  refreshPublicBulletinBoard();
}

function deleteBulletinItem(index) {
  if (!confirm('Дали сте сигурни дека сакате да го избришете соопштението?')) return;

  const items = loadBulletinItems();
  items.splice(index, 1);
  saveBulletinItems(items);

  renderBulletinItemsInAdmin();
  refreshPublicBulletinBoard();
}

async function handleSetupPassword(event) {
  event.preventDefault();
  const pass = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-password-confirm').value;

  if (pass.length < 8) {
    alert('Лозинката мора да има најмалку 8 карактери.');
    return;
  }

  if (pass !== confirm) {
    alert('Лозинките не се совпаѓаат.');
    return;
  }

  const hash = await sha256(pass);
  localStorage.setItem(ADMIN_HASH_KEY, hash);
  localStorage.setItem(AUTH_KEY, 'authenticated');
  alert('Лозинката е поставена успешно.');
  updateAdminPageState();
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const password = document.getElementById('admin-password').value;
  const storedHash = localStorage.getItem(ADMIN_HASH_KEY);

  if (!storedHash) {
    alert('Нема поставена лозинка. Поставете нова лозинка прво.');
    updateAdminPageState();
    return;
  }

  const enteredHash = await sha256(password);
  if (enteredHash === storedHash) {
    localStorage.setItem(AUTH_KEY, 'authenticated');
    document.getElementById('admin-password').value = '';
    updateAdminPageState();
  } else {
    alert('Погрешна лозинка. Обидете се повторно.');
    document.getElementById('admin-password').value = '';
  }
}

function handleAdminLogout() {
  localStorage.removeItem(AUTH_KEY);
  updateAdminPageState();
}

function updateAdminPageState() {
  const hasPasswordHash = !!localStorage.getItem(ADMIN_HASH_KEY);
  const isAuthenticated = isAdminAuthenticated();

  if (!document.getElementById('admin-panel-section')) return;

  hide('admin-setup-section');
  hide('admin-login-section');
  hide('admin-panel-section');

  if (!hasPasswordHash) {
    show('admin-setup-section');
    return;
  }

  if (!isAuthenticated) {
    show('admin-login-section');
    return;
  }

  show('admin-panel-section');
  renderBulletinItemsInAdmin();
}

function showFirstTimePopup() {
  const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
  if (hasVisited || !document.getElementById('hero-title')) return;

  localStorage.setItem(FIRST_VISIT_KEY, 'true');
  const backdrop = document.createElement('div');
  backdrop.className = 'admin-modal-backdrop';
  backdrop.innerHTML = `
    <div class="admin-modal-content" style="max-width: 600px;">
      <h3 class="mb-3">Добредојдовте</h3>
      <p>Оваа страница ги обединува најважните информации за студентите по математика на ПМФ.</p>
      <button class="btn btn-primary w-100" onclick="this.closest('.admin-modal-backdrop').remove();">Продолжи</button>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.remove();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  refreshPublicBulletinBoard();
  showFirstTimePopup();

  const setupForm = document.getElementById('admin-setup-form');
  if (setupForm) setupForm.addEventListener('submit', handleSetupPassword);

  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

  const bulletinForm = document.getElementById('bulletin-form');
  if (bulletinForm) bulletinForm.addEventListener('submit', addNewBulletinItem);

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleAdminLogout);

  updateAdminPageState();
});
