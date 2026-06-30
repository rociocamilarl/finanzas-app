const KEYS = {
  perfil:       'fin_perfil',
  supuestos:    'fin_supuestos',
  ingresos:     'fin_ingresos',
  gastos_fijos: 'fin_gastos_fijos',
  deudas:       'fin_deudas',
  metas:        'fin_metas',
  movimientos:  'fin_movimientos',
  onboarding:   'fin_onboarding_done',
  inicializado: 'fin_init_v2'
};

const Store = {
  init() {
    // Si venía de v1, conservar movimientos y datos del usuario
    const hasOld = localStorage.getItem('fin_init_v1');
    const hasNew = localStorage.getItem(KEYS.inicializado);

    if (hasOld && !hasNew) {
      const movsGuardados = localStorage.getItem('fin_movimientos');
      const onbDone       = localStorage.getItem('fin_onboarding_done');
      localStorage.removeItem('fin_init_v1');
      this._seedBase();
      if (movsGuardados) localStorage.setItem(KEYS.movimientos, movsGuardados);
      if (onbDone)       localStorage.setItem(KEYS.onboarding, onbDone);
      localStorage.setItem(KEYS.inicializado, '1');
    } else if (!hasNew) {
      this._seedBase();
      localStorage.setItem(KEYS.inicializado, '1');
    }
    // v2 existente: no tocar nada
  },

  _seedBase() {
    localStorage.setItem(KEYS.perfil,       JSON.stringify(SEED.perfil));
    localStorage.setItem(KEYS.supuestos,    JSON.stringify(SEED.supuestos));
    localStorage.setItem(KEYS.ingresos,     JSON.stringify(SEED.ingresos));
    localStorage.setItem(KEYS.gastos_fijos, JSON.stringify(SEED.gastos_fijos));
    localStorage.setItem(KEYS.deudas,       JSON.stringify(SEED.deudas));
    localStorage.setItem(KEYS.metas,        JSON.stringify(SEED.metas));
    localStorage.setItem(KEYS.movimientos,  JSON.stringify(SEED.movimientos));
  },

  get(key)      { return JSON.parse(localStorage.getItem(KEYS[key]) || 'null'); },
  set(key, val) {
    localStorage.setItem(KEYS[key], JSON.stringify(val));
    if (typeof Cloud !== 'undefined' && Cloud.isReady()) Cloud.scheduleSave();
  },

  isOnboardingDone() { return !!localStorage.getItem(KEYS.onboarding); },
  setOnboardingDone() { localStorage.setItem(KEYS.onboarding, '1'); },

  getPerfil()       { return this.get('perfil') || SEED.perfil; },
  setPerfil(v)      { this.set('perfil', v); },
  getSupuestos()    { return this.get('supuestos') || SEED.supuestos; },
  setSupuestos(v)   { this.set('supuestos', v); },
  getIngresos()     { return this.get('ingresos') || []; },
  setIngresos(v)    { this.set('ingresos', v); },
  getGastosFijos()  { return this.get('gastos_fijos') || []; },
  setGastosFijos(v) { this.set('gastos_fijos', v); },
  getDeudas()       { return this.get('deudas') || []; },
  setDeudas(v)      { this.set('deudas', v); },
  getMetas()        { return this.get('metas') || []; },
  setMetas(v)       { this.set('metas', v); },
  getMovimientos()  { return this.get('movimientos') || []; },
  setMovimientos(v) { this.set('movimientos', v); },

  addMovimiento(mov) {
    const movs = this.getMovimientos();
    const id = movs.length ? Math.max(...movs.map(m => m.id)) + 1 : 1;
    movs.push({ ...mov, id });
    movs.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
    this.setMovimientos(movs);
    return id;
  },

  deleteMovimiento(id) {
    this.setMovimientos(this.getMovimientos().filter(m => m.id !== id));
  },

  exportar() {
    return JSON.stringify({
      version: 1,
      exportado: new Date().toISOString(),
      perfil:       this.getPerfil(),
      supuestos:    this.getSupuestos(),
      ingresos:     this.getIngresos(),
      gastos_fijos: this.getGastosFijos(),
      deudas:       this.getDeudas(),
      metas:        this.getMetas(),
      movimientos:  this.getMovimientos()
    }, null, 2);
  },

  importar(json) {
    const d = JSON.parse(json);
    if (!d.version) throw new Error('Formato inválido');
    if (d.perfil)       this.set('perfil', d.perfil);
    if (d.supuestos)    this.set('supuestos', d.supuestos);
    if (d.ingresos)     this.set('ingresos', d.ingresos);
    if (d.gastos_fijos) this.set('gastos_fijos', d.gastos_fijos);
    if (d.deudas)       this.set('deudas', d.deudas);
    if (d.metas)        this.set('metas', d.metas);
    if (d.movimientos)  this.set('movimientos', d.movimientos);
    localStorage.setItem(KEYS.inicializado, '1');
    localStorage.setItem(KEYS.onboarding, '1');
  },

  resetear() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
};
