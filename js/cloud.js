// Sincronización con Google Drive y OneDrive (App Folder)
const Cloud = {
  provider: null,   // 'google' | 'microsoft'
  token: null,
  FILE_NAME: 'finanzas_data.json',
  _saveTimer: null,

  init(provider, token) {
    this.provider = provider;
    this.token    = token;
  },

  isReady() {
    return !!(this.provider && this.token);
  },

  // Programa guardado con debounce de 2 s para no saturar la API
  scheduleSave() {
    if (!this.isReady()) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.save(), 2000);
  },

  async save() {
    if (!this.isReady()) return;
    try {
      const payload = Store.exportar(); // JSON string
      if (this.provider === 'google')    await this._saveGoogle(payload);
      if (this.provider === 'microsoft') await this._saveMicrosoft(payload);
    } catch (e) {
      console.warn('[Cloud] Error al guardar:', e);
    }
  },

  async load() {
    if (!this.isReady()) return null;
    try {
      if (this.provider === 'google')    return await this._loadGoogle();
      if (this.provider === 'microsoft') return await this._loadMicrosoft();
    } catch (e) {
      console.warn('[Cloud] Error al cargar:', e);
    }
    return null;
  },

  // ── Google Drive — App Folder ────────────────────────────────
  async _googleFileId() {
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%22${this.FILE_NAME}%22&fields=files(id)`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    const d = await r.json();
    return d.files?.[0]?.id ?? null;
  },

  async _saveGoogle(jsonStr) {
    const fileId = await this._googleFileId();
    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: jsonStr
      });
    } else {
      const boundary = 'fin_b0undary';
      const meta     = JSON.stringify({ name: this.FILE_NAME, parents: ['appDataFolder'] });
      const body     = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonStr}\r\n--${boundary}--`;
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      });
    }
  },

  async _loadGoogle() {
    const fileId = await this._googleFileId();
    if (!fileId) return null;
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return r.ok ? r.json() : null;
  },

  // ── OneDrive — App Folder via Microsoft Graph ────────────────
  async _saveMicrosoft(jsonStr) {
    await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${this.FILE_NAME}:/content`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: jsonStr
      }
    );
  },

  async _loadMicrosoft() {
    const r = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${this.FILE_NAME}:/content`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    return r.ok ? r.json() : null;
  }
};
