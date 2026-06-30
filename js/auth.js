const Auth = {
  SESSION_KEY: 'fin_auth_session',
  PASS_KEY:    'fin_auth_hash',

  async hash(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  getStoredHash() { return localStorage.getItem(this.PASS_KEY); },
  isAuthenticated() { return sessionStorage.getItem(this.SESSION_KEY) === '1'; },
  setSession() { sessionStorage.setItem(this.SESSION_KEY, '1'); },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    location.reload();
  },

  async verify(password) {
    const stored = this.getStoredHash();
    if (!stored) return false;
    return (await this.hash(password)) === stored;
  },

  async changePassword(oldPass, newPass) {
    if ((await this.hash(oldPass)) !== this.getStoredHash()) return false;
    localStorage.setItem(this.PASS_KEY, await this.hash(newPass));
    return true;
  },

  init() {
    Store.init();

    // 1. Si no completó el onboarding → mostrarlo
    if (!Store.isOnboardingDone()) {
      Onboarding.init();
      return;
    }

    // 2. Si ya tiene sesión → lanzar app
    if (this.isAuthenticated()) {
      document.getElementById('login-screen').classList.add('hidden');
      App.init();
      return;
    }

    // 3. Mostrar login
    document.getElementById('app').style.visibility = 'hidden';
    const form  = document.getElementById('login-form');
    const input = document.getElementById('login-pass');
    const error = document.getElementById('login-error');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const ok = await this.verify(input.value);
      if (ok) {
        this.setSession();
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').style.visibility = 'visible';
        App.init();
      } else {
        error.classList.add('show');
        input.value = '';
        input.classList.add('shake');
        input.addEventListener('animationend', () => input.classList.remove('shake'), { once: true });
        setTimeout(() => error.classList.remove('show'), 3000);
      }
    });
  }
};
