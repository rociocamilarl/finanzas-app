// OAuth — Google Drive + OneDrive
// ⚠️  Reemplaza estos IDs con los tuyos antes de desplegar
const GOOGLE_CLIENT_ID    = '89875406015-lcdbqhptm4bikmg1d7senj6c2ud6mgjf.apps.googleusercontent.com';
const MICROSOFT_CLIENT_ID = 'TU_MICROSOFT_CLIENT_ID';

const Auth = {
  SESSION_KEY: 'fin_auth_session',
  msalApp: null,

  isAuthenticated() {
    return !!sessionStorage.getItem(this.SESSION_KEY);
  },

  saveSession(user) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  },

  getUser() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)); } catch { return null; }
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    Cloud.init(null, null);
    location.reload();
  },

  init() {
    Store.init();

    // Sesión activa
    if (this.isAuthenticated()) {
      const u = this.getUser();
      if (u?.token) {
        Cloud.init(u.provider, u.token);
        Cloud.load().then(d => { if (d) Store.importar(JSON.stringify(d)); });
      }
      document.getElementById('login-screen').classList.add('hidden');
      App.init();
      return;
    }

    // Sin onboarding: mostrar login OAuth
    if (Store.isOnboardingDone()) {
      document.getElementById('app').style.visibility = 'hidden';
      return; // login screen ya visible en HTML
    }

    // Sin onboarding Y sin sesión: ir a onboarding
    document.getElementById('login-screen').classList.add('hidden');
    Onboarding.init();
  },

  // ── Google ───────────────────────────────────────────────────
  loginGoogle() {
    if (typeof google === 'undefined') {
      UI.showToast('Cargando Google... intenta en un momento');
      return;
    }
    this._setLoading('google', true);

    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'email profile https://www.googleapis.com/auth/drive.appdata',
      callback: async resp => {
        if (resp.error) {
          this._setLoading('google', false);
          UI.showToast('No se pudo conectar con Google');
          return;
        }
        const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${resp.access_token}` }
        }).then(r => r.json());

        await this._afterLogin('google', resp.access_token, info.email, info.name || info.email);
      }
    });
    client.requestAccessToken({ prompt: '' });
  },

  // ── Microsoft ────────────────────────────────────────────────
  async loginMicrosoft() {
    this._setLoading('microsoft', true);
    try {
      if (!this.msalApp) {
        await this._loadMsal();
        this.msalApp = new msal.PublicClientApplication({
          auth: {
            clientId: MICROSOFT_CLIENT_ID,
            authority: 'https://login.microsoftonline.com/common',
            redirectUri: location.origin + location.pathname
          },
          cache: { cacheLocation: 'sessionStorage' }
        });
        await this.msalApp.initialize();
      }

      const result = await this.msalApp.loginPopup({
        scopes: ['User.Read', 'Files.ReadWrite.AppFolder']
      });
      const tokenResp = await this.msalApp.acquireTokenSilent({
        scopes: ['Files.ReadWrite.AppFolder'],
        account: result.account
      });

      await this._afterLogin(
        'microsoft',
        tokenResp.accessToken,
        result.account.username,
        result.account.name || result.account.username
      );
    } catch (e) {
      console.error(e);
      this._setLoading('microsoft', false);
      UI.showToast('No se pudo conectar con Microsoft');
    }
  },

  // ── Lógica común post-login ──────────────────────────────────
  async _afterLogin(provider, token, email, name) {
    Cloud.init(provider, token);

    UI.showToast('Sincronizando datos...');
    const cloudData = await Cloud.load();

    if (cloudData) {
      // Usuario existente: cargar desde la nube
      Store.importar(JSON.stringify(cloudData));
      this.saveSession({ provider, token, email, name });
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app').style.visibility = 'visible';
      UI.showToast(`Hola de nuevo, ${name.split(' ')[0]} 👋`);
      App.init();
    } else {
      // Usuario nuevo: ir al onboarding con email pre-cargado
      this.saveSession({ provider, token, email, name });
      document.getElementById('login-screen').classList.add('hidden');
      Onboarding.initConEmail(email, name, provider);
    }
  },

  _setLoading(provider, loading) {
    const btn = document.getElementById(`btn-${provider}`);
    if (!btn) return;
    btn.disabled = loading;
    const labels = { google: 'Entrar con Google', microsoft: 'Entrar con Microsoft' };
    btn.querySelector('.btn-label').textContent = loading ? 'Conectando...' : labels[provider];
  },

  _loadMsal() {
    return new Promise((res, rej) => {
      if (typeof msal !== 'undefined') { res(); return; }
      const s = document.createElement('script');
      s.src = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';
      s.onload  = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
};
