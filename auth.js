const USERS_KEY = 'nolamedu_users';
const SESSION_KEY = 'nolamedu_session';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(email) {
  if (email) {
    localStorage.setItem(SESSION_KEY, email);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
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

async function registerUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('An account already exists with that email.');
  }
  const passwordHash = await hashPassword(password);
  users.push({ email: normalizedEmail, passwordHash });
  saveUsers(users);
  setSession(normalizedEmail);
  return normalizedEmail;
}

async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getUsers();
  const user = users.find((userRecord) => userRecord.email === normalizedEmail);
  if (!user) {
    throw new Error('No account found with that email.');
  }
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error('The password is incorrect.');
  }
  setSession(normalizedEmail);
  return normalizedEmail;
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
    container.innerHTML = `
      <a href="account.html">My Account</a>
      <button type="button" class="button auth-button" id="logout-button">Logout</button>
    `;
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', logout);
    }
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
      setTimeout(() => {
        window.location.href = 'account.html';
      }, 800);
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });
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
      await registerUser(email, password);
      showMessage(message, 'Account created. Redirecting to your dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'account.html';
      }, 900);
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

  welcomeText.textContent = `Signed in as ${accountEmail}`;

  const logoutButton = document.getElementById('account-logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  renderAuthLinks();
  initLoginPage();
  initRegisterPage();
  initAccountPage();
});
