const USERS_KEY = 'nolamedu_users';
const SESSION_KEY = 'nolamedu_session';

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUser(email) {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  const users = getUsers();
  return users.find((u) => u.email === normalized) || null;
}

function getUserIndex(email) {
  const normalized = normalizeEmail(email);
  const users = getUsers();
  return users.findIndex((u) => u.email === normalized);
}

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(email) {
  if (email) localStorage.setItem(SESSION_KEY, email);
  else localStorage.removeItem(SESSION_KEY);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function showMessage(container, message, type = 'error') {
  if (!container) return;
  container.textContent = message;
  container.className = `auth-message ${type}`;
}

async function registerUser(email, password, name) {
  const normalizedEmail = normalizeEmail(email);
  const users = getUsers();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account already exists with that email.');
  }
  const passwordHash = await hashPassword(password);
  const isAdmin = users.length === 0; // first user becomes admin
  const displayName = (name && name.trim()) || normalizedEmail.split('@')[0];
  const user = {
    email: normalizedEmail,
    passwordHash,
    name: name || '',
    displayName,
    isAdmin: !!isAdmin,
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  setSession(normalizedEmail);
  return normalizedEmail;
}

async function loginUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const user = getUser(normalizedEmail);
  if (!user) throw new Error('No account found with that email.');
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) throw new Error('The password is incorrect.');
  setSession(normalizedEmail);
  return normalizedEmail;
}

async function updateUser(email, updates = {}) {
  const idx = getUserIndex(email);
  if (idx === -1) throw new Error('User not found.');
  const users = getUsers();
  const user = users[idx];
  if (updates.password) {
    user.passwordHash = await hashPassword(updates.password);
    delete updates.password;
  }
  Object.assign(user, updates);
  users[idx] = user;
  saveUsers(users);
  return user;
}

function createResetToken(email) {
  const idx = getUserIndex(email);
  if (idx === -1) throw new Error('No account found with that email.');
  const users = getUsers();
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  users[idx].resetToken = token;
  users[idx].resetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  saveUsers(users);
  return token;
}

async function resetPassword(email, token, newPassword) {
  const idx = getUserIndex(email);
  if (idx === -1) throw new Error('No account found with that email.');
  const users = getUsers();
  const user = users[idx];
  if (!user.resetToken || user.resetToken !== token) throw new Error('Invalid reset token.');
  if (Date.now() > (user.resetExpires || 0)) throw new Error('Reset token has expired.');
  user.passwordHash = await hashPassword(newPassword);
  delete user.resetToken;
  delete user.resetExpires;
  users[idx] = user;
  saveUsers(users);
  return true;
}

function listUsers() {
  return getUsers();
}

function deleteUser(email) {
  const idx = getUserIndex(email);
  if (idx === -1) throw new Error('User not found.');
  const users = getUsers();
  const removed = users.splice(idx, 1);
  saveUsers(users);
  if (getSession() === normalizeEmail(email)) setSession(null);
  return removed[0];
}

function toggleAdmin(email) {
  const idx = getUserIndex(email);
  if (idx === -1) throw new Error('User not found.');
  const users = getUsers();
  users[idx].isAdmin = !users[idx].isAdmin;
  saveUsers(users);
  return users[idx].isAdmin;
}

function logout() {
  setSession(null);
  window.location.href = 'index.html';
}

function renderAuthLinks() {
  const container = document.getElementById('auth-links');
  if (!container) return;
  const userEmail = getSession();
  if (userEmail) {
    const user = getUser(userEmail);
    const adminLink = user && user.isAdmin ? '<a href="admin.html">Admin</a>' : '';
    container.innerHTML = `
      <a href="account.html">My Account</a>
      ${adminLink}
      <button type="button" class="button auth-button" id="logout-button">Logout</button>
    `;
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.addEventListener('click', logout);
  } else {
    container.innerHTML = `
      <a href="login.html">Login</a>
      <a href="register.html" class="button auth-button">Register</a>
    `;
  }
}

function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  const message = document.getElementById('login-message');
  if (!loginForm) return;
  if (getSession()) {
    window.location.href = 'account.html';
    return;
  }

  // Login submit
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    showMessage(message, '', '');

    if (!email || !password) {
      showMessage(message, 'Please enter both email and password.', 'error');
      return;
    }

    try {
      await loginUser(email, password);
      showMessage(message, 'Login successful. Redirecting...', 'success');
      setTimeout(() => (window.location.href = 'account.html'), 800);
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });

  // Forgot password flow (demo: shows token on screen)
  const forgotLink = document.getElementById('forgot-link');
  const forgotPanel = document.getElementById('forgot-panel');
  const forgotForm = document.getElementById('forgot-form');
  const forgotMessage = document.getElementById('forgot-message');
  const resetForm = document.getElementById('reset-form');
  const resetMessage = document.getElementById('reset-message');
  if (forgotLink && forgotPanel) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotPanel.style.display = 'block';
      if (forgotForm) forgotForm.style.display = 'block';
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = (document.getElementById('forgot-email') || {}).value;
      showMessage(forgotMessage, '', '');
      try {
        const token = createResetToken(email);
        showMessage(forgotMessage, 'Reset code sent (demo): ' + token, 'success');
        if (resetForm) {
          resetForm.style.display = 'block';
          const resetEmailInput = document.getElementById('reset-email');
          if (resetEmailInput) resetEmailInput.value = email;
        }
      } catch (err) {
        showMessage(forgotMessage, err.message, 'error');
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('reset-email') || {}).value;
      const token = (document.getElementById('reset-token') || {}).value;
      const newPassword = (document.getElementById('reset-password') || {}).value;
      const confirm = (document.getElementById('reset-confirm') || {}).value;
      showMessage(resetMessage, '', '');
      if (!newPassword || newPassword.length < 8) {
        showMessage(resetMessage, 'Password must be at least 8 characters long.', 'error');
        return;
      }
      if (newPassword !== confirm) {
        showMessage(resetMessage, 'Passwords do not match.', 'error');
        return;
      }
      try {
        await resetPassword(email, token, newPassword);
        showMessage(resetMessage, 'Password reset — you can now sign in.', 'success');
        setTimeout(() => (window.location.href = 'login.html'), 900);
      } catch (err) {
        showMessage(resetMessage, err.message, 'error');
      }
    });
  }
}

function initRegisterPage() {
  const registerForm = document.getElementById('register-form');
  const message = document.getElementById('register-message');
  if (!registerForm) return;
  if (getSession()) {
    window.location.href = 'account.html';
    return;
  }

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirmPassword.value;
    const name = (registerForm.name || {}).value || '';
    showMessage(message, '', '');

    if (!email || !password || !confirmPassword) {
      showMessage(message, 'Please fill in all fields.', 'error');
      return;
    }
    if (password.length < 8) {
      showMessage(message, 'Password must be at least 8 characters long.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showMessage(message, 'Passwords do not match.', 'error');
      return;
    }

    try {
      await registerUser(email, password, name);
      showMessage(message, 'Account created. Redirecting to your dashboard...', 'success');
      setTimeout(() => (window.location.href = 'account.html'), 900);
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });
}

function initAccountPage() {
  const welcomeText = document.getElementById('account-welcome');
  const accountEmail = getSession();
  if (!welcomeText) return;
  if (!accountEmail) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser(accountEmail);
  welcomeText.textContent = `Signed in as ${accountEmail}`;

  const accountForm = document.getElementById('account-form');
  const accountMessage = document.getElementById('account-message');
  if (accountForm && user) {
    const emailInput = document.getElementById('account-email');
    const nameInput = document.getElementById('account-name');
    const displayInput = document.getElementById('account-display');
    if (emailInput) emailInput.value = user.email;
    if (nameInput) nameInput.value = user.name || '';
    if (displayInput) displayInput.value = user.displayName || '';

    accountForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(accountMessage, '', '');
      const updates = {
        name: (nameInput || {}).value || '',
        displayName: (displayInput || {}).value || '',
      };
      try {
        await updateUser(accountEmail, updates);
        showMessage(accountMessage, 'Profile saved.', 'success');
      } catch (err) {
        showMessage(accountMessage, err.message, 'error');
      }
    });
  }

  const logoutButton = document.getElementById('account-logout');
  if (logoutButton) logoutButton.addEventListener('click', logout);
}

function initAdminPage() {
  const adminRoot = document.getElementById('admin-root');
  if (!adminRoot) return;
  const session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  const me = getUser(session);
  if (!me || !me.isAdmin) {
    window.location.href = 'index.html';
    return;
  }

  const tbody = document.getElementById('admin-users-tbody');
  const adminMessage = document.getElementById('admin-message');

  function render() {
    const users = listUsers();
    tbody.innerHTML = '';
    users.forEach((u) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.email}</td>
        <td>${(u.name || '')}</td>
        <td>${u.isAdmin ? 'admin' : 'user'}</td>
        <td>
          <button class="button" data-action="toggle" data-email="${u.email}">Toggle admin</button>
          <button class="button button-secondary" data-action="delete" data-email="${u.email}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const email = btn.getAttribute('data-email');
    showMessage(adminMessage, '', '');
    try {
      if (action === 'toggle') {
        toggleAdmin(email);
        showMessage(adminMessage, 'Toggled admin for ' + email, 'success');
      } else if (action === 'delete') {
        if (email === me.email) {
          showMessage(adminMessage, 'Cannot delete your own admin account.', 'error');
          return;
        }
        deleteUser(email);
        showMessage(adminMessage, 'Deleted ' + email, 'success');
      }
      render();
    } catch (err) {
      showMessage(adminMessage, err.message, 'error');
    }
  });

  render();
}

window.addEventListener('DOMContentLoaded', () => {
  renderAuthLinks();
  initLoginPage();
  initRegisterPage();
  initAccountPage();
  initAdminPage();
});

// Seed a demo account if it doesn't exist (safe client-side demo only)
(async function seedDemoAccount(){
  try {
    const seedEmail = 'qi.wanglin.o2';
    const seedPassword = 'Hatienminh09062015@';
    const existing = getUser(seedEmail);
    if (existing) return;
    const passwordHash = await hashPassword(seedPassword);
    const users = getUsers();
    const user = {
      email: normalizeEmail(seedEmail),
      passwordHash,
      name: 'Qi Wanglin',
      displayName: 'qi.wanglin.o2',
      isAdmin: true,
      createdAt: Date.now(),
    };
    users.push(user);
    saveUsers(users);
    console.info('Seeded demo account:', user.email);
  } catch (err) {
    console.warn('Failed to seed demo account', err);
  }
})();
