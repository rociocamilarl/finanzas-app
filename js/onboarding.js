// Wizard de onboarding — recoge toda la configuración inicial del usuario
const Onboarding = {
  paso: 1,
  totalPasos: 6,
  datos: {
    perfil:       { nombre: '', email: '' },
    supuestos:    { uf: 0, usa_uf: false, tipo_cambio: 0, tipo_cambio_label: '', usa_tipo_cambio: false },
    ingresos:     [],
    gastos_fijos: [],
    deudas:       [],
    metas:        [],
    password:     ''
  },

  init() {
    if (Store.isOnboardingDone()) return false;
    this.mostrar();
    return true;
  },

  // Llamado desde Auth cuando el usuario es nuevo y ya tiene email del OAuth
  initConEmail(email, nombre, provider) {
    this.datos.perfil.email    = email;
    this.datos.perfil.nombre   = nombre.split(' ')[0]; // solo primer nombre
    this._oauthProvider        = provider;
    this.mostrar();
  },

  mostrar() {
    document.getElementById('app').style.visibility = 'hidden';
    document.getElementById('login-screen').classList.add('hidden');
    const el = document.getElementById('onboarding-screen');
    el.classList.remove('hidden');
    this.renderPaso();
  },

  renderPaso() {
    const el = document.getElementById('onboarding-body');
    const pct = Math.round((this.paso / this.totalPasos) * 100);
    document.getElementById('ob-progress-fill').style.width = pct + '%';
    document.getElementById('ob-paso-label').textContent = `Paso ${this.paso} de ${this.totalPasos}`;

    const renders = [
      null,
      this.paso1.bind(this),
      this.paso2.bind(this),
      this.paso3.bind(this),
      this.paso4.bind(this),
      this.paso5.bind(this),
      this.paso6.bind(this)
    ];
    el.innerHTML = renders[this.paso]();
    this.bindPaso();
  },

  // ── Paso 1: Bienvenida + nombre ──────────────────────────────
  paso1() {
    return `
      <div class="ob-hero">👋</div>
      <h2 class="ob-title">¡Bienvenido/a!</h2>
      <p class="ob-desc">Vamos a configurar tu controller financiero personal en pocos minutos.</p>
      <div class="form-group">
        <label class="form-label">¿Cómo te llamas?</label>
        <input class="form-input" id="ob-nombre" type="text" placeholder="Tu nombre" value="${this.datos.perfil.nombre}" autocomplete="given-name">
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" id="ob-email" type="email" placeholder="tu@email.com" value="${this.datos.perfil.email}" autocomplete="email" required>
      </div>`;
  },

  // ── Paso 2: Supuestos ────────────────────────────────────────
  paso2() {
    const s = this.datos.supuestos;
    return `
      <div class="ob-hero">⚙️</div>
      <h2 class="ob-title">Parámetros base</h2>
      <p class="ob-desc">Configura los valores de referencia que usará la app para calcular gastos variables.</p>

      <div class="ob-toggle-row">
        <span>¿Tienes gastos en UF?</span>
        <label class="toggle"><input type="checkbox" id="ob-usa-uf" ${s.usa_uf ? 'checked' : ''}><span class="toggle-slider"></span></label>
      </div>
      <div id="ob-uf-row" class="form-group" style="${s.usa_uf ? '' : 'display:none'}">
        <label class="form-label">Valor UF actual (CLP)</label>
        <input class="form-input" id="ob-uf" type="number" placeholder="ej: 40817" value="${s.uf || ''}">
      </div>

      <div class="ob-toggle-row" style="margin-top:16px">
        <span>¿Tienes gastos en moneda extranjera?</span>
        <label class="toggle"><input type="checkbox" id="ob-usa-tc" ${s.usa_tipo_cambio ? 'checked' : ''}><span class="toggle-slider"></span></label>
      </div>
      <div id="ob-tc-rows" style="${s.usa_tipo_cambio ? '' : 'display:none'}">
        <div class="form-group">
          <label class="form-label">¿Qué moneda? (ej: USD, EUR, GBP)</label>
          <input class="form-input" id="ob-tc-label" type="text" placeholder="USD" value="${s.tipo_cambio_label || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de cambio (CLP por 1 unidad)</label>
          <input class="form-input" id="ob-tc" type="number" placeholder="ej: 950" value="${s.tipo_cambio || ''}">
        </div>
      </div>`;
  },

  // ── Paso 3: Ingresos ─────────────────────────────────────────
  paso3() {
    return `
      <div class="ob-hero">💰</div>
      <h2 class="ob-title">Ingresos mensuales</h2>
      <p class="ob-desc">Agrega todas tus fuentes de ingreso mensual fijo.</p>
      <div id="ob-ingresos-list">
        ${this.datos.ingresos.map((ing, i) => this.renderIngRow(ing, i)).join('')}
      </div>
      <button class="btn btn-outline" id="ob-add-ing" style="margin-top:8px">+ Agregar ingreso</button>`;
  },

  renderIngRow(ing, i) {
    return `<div class="ob-item-row" data-i="${i}">
      <input class="form-input ob-ing-nombre" placeholder="ej: Sueldo líquido" value="${ing.concepto || ''}">
      <div style="display:flex;gap:8px;margin-top:6px">
        <input class="form-input ob-ing-monto" type="number" placeholder="Monto CLP" value="${ing.monto || ''}" style="flex:1">
        <button class="btn btn-danger btn-sm ob-del-ing" data-i="${i}">✕</button>
      </div>
    </div>`;
  },

  // ── Paso 4: Gastos fijos ─────────────────────────────────────
  paso4() {
    const usaUF = this.datos.supuestos.usa_uf;
    return `
      <div class="ob-hero">💸</div>
      <h2 class="ob-title">Gastos fijos mensuales</h2>
      <p class="ob-desc">Agrega todos tus gastos que se repiten cada mes.</p>
      <div id="ob-gastos-list">
        ${this.datos.gastos_fijos.map((g, i) => this.renderGastoRow(g, i, usaUF)).join('')}
      </div>
      <button class="btn btn-outline" id="ob-add-gasto" style="margin-top:8px">+ Agregar gasto fijo</button>`;
  },

  renderGastoRow(g, i, usaUF) {
    return `<div class="ob-item-row" data-i="${i}">
      <input class="form-input ob-g-nombre" placeholder="ej: Dividendo, celular..." value="${g.concepto || ''}">
      <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
        ${usaUF ? `<label style="font-size:12px;display:flex;gap:4px;align-items:center;white-space:nowrap">
          <input type="checkbox" class="ob-g-esuf" ${g.es_uf ? 'checked' : ''}> en UF
        </label>` : ''}
        <input class="form-input ob-g-monto" type="number" placeholder="${g.es_uf ? 'Valor UF' : 'Monto CLP'}" value="${g.es_uf ? (g.monto_uf || '') : (g.monto || '')}" style="flex:1">
        <button class="btn btn-danger btn-sm ob-del-gasto" data-i="${i}">✕</button>
      </div>
    </div>`;
  },

  // ── Paso 5: Deudas ───────────────────────────────────────────
  paso5() {
    return `
      <div class="ob-hero">🏦</div>
      <h2 class="ob-title">Deudas</h2>
      <p class="ob-desc">Opcional. Agrega tus deudas activas. Puedes agregar tramos (ej: Fondo Solidario) con imputación automática al más antiguo.</p>
      <div id="ob-deudas-list">
        ${this.datos.deudas.map((d, i) => this.renderDeudaRow(d, i)).join('')}
      </div>
      <button class="btn btn-outline" id="ob-add-deuda" style="margin-top:8px">+ Agregar deuda</button>`;
  },

  renderDeudaRow(d, i) {
    const freq = d.frecuencia || 'mensual';
    return `<div class="ob-item-row" data-i="${i}">
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-input ob-d-nombre" placeholder="ej: Crédito consumo" value="${d.nombre || ''}" style="flex:1">
        <button class="btn btn-danger btn-sm ob-del-deuda" data-i="${i}">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label">Saldo actual</label>
          <input class="form-input ob-d-saldo" type="number" placeholder="CLP" value="${d.saldo || ''}">
        </div>
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label">Frecuencia de pago</label>
          <select class="form-input ob-d-freq">
            <option value="mensual" ${freq==='mensual'?'selected':''}>Mensual</option>
            <option value="anual"   ${freq==='anual'  ?'selected':''}>Anual</option>
            <option value="otra"    ${freq==='otra'   ?'selected':''}>Otra / irregular</option>
          </select>
        </div>
      </div>
      <div class="ob-d-cuota-row" style="margin-top:6px;${freq==='anual'?'':''}">
        <label class="form-label">${freq==='anual' ? 'Monto anual' : freq==='mensual' ? 'Cuota mensual' : 'Monto por cuota'}</label>
        <input class="form-input ob-d-cuota" type="number" placeholder="CLP" value="${d.cuota || ''}">
      </div>
      <div style="margin-top:6px">
        <label class="form-label">Próximo vencimiento</label>
        <input class="form-input ob-d-venc" type="date" value="${d.vencimiento || ''}">
      </div>
    </div>`;
  },

  // ── Paso 6: Metas ────────────────────────────────────────────
  paso6() {
    return `
      <div class="ob-hero">🎯</div>
      <h2 class="ob-title">Metas de ahorro</h2>
      <p class="ob-desc">Opcional. Define tus objetivos de ahorro con montos y fechas.</p>
      <div id="ob-metas-list">
        ${this.datos.metas.map((m, i) => this.renderMetaRow(m, i)).join('')}
      </div>
      <button class="btn btn-outline" id="ob-add-meta" style="margin-top:8px">+ Agregar meta</button>`;
  },

  renderMetaRow(m, i) {
    return `<div class="ob-item-row" data-i="${i}">
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-input ob-m-nombre" placeholder="ej: Viaje, Emergencia..." value="${m.nombre || ''}" style="flex:1">
        <button class="btn btn-danger btn-sm ob-del-meta" data-i="${i}">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label">Objetivo (CLP)</label>
          <input class="form-input ob-m-objetivo" type="number" placeholder="0" value="${m.objetivo || ''}">
        </div>
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label">Fecha objetivo</label>
          <input class="form-input ob-m-fecha" type="month" value="${m.fecha_objetivo || ''}">
        </div>
      </div>
    </div>`;
  },

  // ── Paso 6 ahora incluye resumen final (contraseña eliminada — auth vía OAuth) ──
  // paso7 redirigido a paso6 en renders[]; este método es el nuevo resumen
  paso6_resumen_extra() { return ''; }, // reservado

  // ── Bind eventos por paso ────────────────────────────────────
  bindPaso() {
    if (this.paso === 2) {
      document.getElementById('ob-usa-uf').addEventListener('change', e => {
        document.getElementById('ob-uf-row').style.display = e.target.checked ? '' : 'none';
      });
      document.getElementById('ob-usa-tc').addEventListener('change', e => {
        document.getElementById('ob-tc-rows').style.display = e.target.checked ? '' : 'none';
      });
    }
    if (this.paso === 3) this.bindLista('ing');
    if (this.paso === 4) this.bindLista('gasto');
    if (this.paso === 5) this.bindLista('deuda');
    if (this.paso === 6) this.bindLista('meta');
  },

  bindLista(tipo) {
    const listIds = { ing: 'ob-ingresos-list', gasto: 'ob-gastos-list', deuda: 'ob-deudas-list', meta: 'ob-metas-list' };
    const addBtns = { ing: 'ob-add-ing', gasto: 'ob-add-gasto', deuda: 'ob-add-deuda', meta: 'ob-add-meta' };
    const usaUF   = this.datos.supuestos.usa_uf;

    document.getElementById(addBtns[tipo])?.addEventListener('click', () => {
      const lista = document.getElementById(listIds[tipo]);
      const idx   = lista.children.length;

      // Insertar nueva fila directamente sin re-renderizar todo
      const div = document.createElement('div');
      if (tipo === 'ing')   div.innerHTML = this.renderIngRow({ concepto: '', monto: 0 }, idx);
      if (tipo === 'gasto') div.innerHTML = this.renderGastoRow({ concepto: '', monto: 0, es_uf: false }, idx, usaUF);
      if (tipo === 'deuda') div.innerHTML = this.renderDeudaRow({ nombre: '', saldo: 0, cuota: 0, vencimiento: '', frecuencia: 'mensual' }, idx);
      if (tipo === 'meta')  div.innerHTML = this.renderMetaRow({ nombre: '', objetivo: 0, fecha_objetivo: '' }, idx);
      lista.appendChild(div.firstElementChild);

      // Bind del botón eliminar en la nueva fila
      div.firstElementChild?.querySelector(`.ob-del-${tipo}`)?.addEventListener('click', e => {
        e.currentTarget.closest('.ob-item-row').remove();
      });
    });

    // Bind eliminar en filas existentes
    document.querySelectorAll(`.ob-del-${tipo}`).forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.ob-item-row').remove();
      });
    });
  },

  // Captura los valores actuales del DOM y los guarda en this.datos
  _capturarDOM() {
    if (this.paso === 3) {
      document.querySelectorAll('.ob-ing-nombre').forEach((el, i) => {
        if (this.datos.ingresos[i]) this.datos.ingresos[i].concepto = el.value;
      });
      document.querySelectorAll('.ob-ing-monto').forEach((el, i) => {
        if (this.datos.ingresos[i]) this.datos.ingresos[i].monto = parseFloat(el.value) || 0;
      });
    }
    if (this.paso === 4) {
      document.querySelectorAll('.ob-g-nombre').forEach((el, i) => {
        if (this.datos.gastos_fijos[i]) this.datos.gastos_fijos[i].concepto = el.value;
      });
      document.querySelectorAll('.ob-g-monto').forEach((el, i) => {
        if (this.datos.gastos_fijos[i]) this.datos.gastos_fijos[i].monto = parseFloat(el.value) || 0;
      });
    }
    if (this.paso === 5) {
      document.querySelectorAll('.ob-d-nombre').forEach((el, i) => {
        if (this.datos.deudas[i]) this.datos.deudas[i].nombre = el.value;
      });
      document.querySelectorAll('.ob-d-saldo').forEach((el, i) => {
        if (this.datos.deudas[i]) this.datos.deudas[i].saldo = parseFloat(el.value) || 0;
      });
      document.querySelectorAll('.ob-d-cuota').forEach((el, i) => {
        if (this.datos.deudas[i]) this.datos.deudas[i].cuota = parseFloat(el.value) || 0;
      });
      document.querySelectorAll('.ob-d-venc').forEach((el, i) => {
        if (this.datos.deudas[i]) this.datos.deudas[i].vencimiento = el.value;
      });
      document.querySelectorAll('.ob-d-freq').forEach((el, i) => {
        if (this.datos.deudas[i]) this.datos.deudas[i].frecuencia = el.value;
      });
    }
    if (this.paso === 6) {
      document.querySelectorAll('.ob-m-nombre').forEach((el, i) => {
        if (this.datos.metas[i]) this.datos.metas[i].nombre = el.value;
      });
      document.querySelectorAll('.ob-m-objetivo').forEach((el, i) => {
        if (this.datos.metas[i]) this.datos.metas[i].objetivo = parseFloat(el.value) || 0;
      });
      document.querySelectorAll('.ob-m-fecha').forEach((el, i) => {
        if (this.datos.metas[i]) this.datos.metas[i].fecha_objetivo = el.value;
      });
    }
  },

  // ── Guardar datos del paso actual ────────────────────────────
  guardarPaso() {
    if (this.paso === 1) {
      const nombre = document.getElementById('ob-nombre').value.trim();
      const email  = document.getElementById('ob-email').value.trim();
      if (!nombre) { this.error('Ingresa tu nombre'); return false; }
      if (!email || !email.includes('@')) { this.error('Ingresa un email válido'); return false; }
      this.datos.perfil.nombre = nombre;
      this.datos.perfil.email  = email;
    }
    if (this.paso === 2) {
      const usaUF = document.getElementById('ob-usa-uf').checked;
      const usaTC = document.getElementById('ob-usa-tc').checked;
      this.datos.supuestos.usa_uf = usaUF;
      this.datos.supuestos.usa_tipo_cambio = usaTC;
      if (usaUF) this.datos.supuestos.uf = parseFloat(document.getElementById('ob-uf').value) || 0;
      if (usaTC) {
        this.datos.supuestos.tipo_cambio_label = document.getElementById('ob-tc-label').value.trim();
        this.datos.supuestos.tipo_cambio = parseFloat(document.getElementById('ob-tc').value) || 0;
      }
    }
    if (this.paso === 3) {
      const nombres = document.querySelectorAll('.ob-ing-nombre');
      const montos  = document.querySelectorAll('.ob-ing-monto');
      this.datos.ingresos = [];
      nombres.forEach((el, i) => {
        const concepto = el.value.trim();
        const monto    = parseFloat(montos[i].value) || 0;
        if (concepto) this.datos.ingresos.push({ id: i + 1, concepto, monto });
      });
      if (!this.datos.ingresos.length) { this.error('Agrega al menos un ingreso'); return false; }
    }
    if (this.paso === 4) {
      const nombres = document.querySelectorAll('.ob-g-nombre');
      const montos  = document.querySelectorAll('.ob-g-monto');
      const esUFs   = document.querySelectorAll('.ob-g-esuf');
      this.datos.gastos_fijos = [];
      nombres.forEach((el, i) => {
        const concepto = el.value.trim();
        const esUF     = esUFs[i]?.checked || false;
        const val      = parseFloat(montos[i].value) || 0;
        if (concepto) this.datos.gastos_fijos.push({
          id: i + 1, concepto,
          es_uf: esUF,
          monto: esUF ? 0 : val,
          monto_uf: esUF ? val : 0
        });
      });
    }
    if (this.paso === 5) {
      const nombres  = document.querySelectorAll('.ob-d-nombre');
      const saldos   = document.querySelectorAll('.ob-d-saldo');
      const cuotas   = document.querySelectorAll('.ob-d-cuota');
      const vencs    = document.querySelectorAll('.ob-d-venc');
      this.datos.deudas = [];
      const freqs = document.querySelectorAll('.ob-d-freq');
      nombres.forEach((el, i) => {
        const nombre = el.value.trim();
        if (nombre) this.datos.deudas.push({
          id: 'deuda_' + (i + 1),
          nombre,
          saldo:       parseFloat(saldos[i].value) || 0,
          original:    parseFloat(saldos[i].value) || 0,
          cuota:       parseFloat(cuotas[i].value) || 0,
          vencimiento: vencs[i].value || null,
          frecuencia:  freqs[i]?.value || 'mensual',
          tiene_tramos: false
        });
      });
    }
    if (this.paso === 6) {
      const nombres   = document.querySelectorAll('.ob-m-nombre');
      const objetivos = document.querySelectorAll('.ob-m-objetivo');
      const fechas    = document.querySelectorAll('.ob-m-fecha');
      this.datos.metas = [];
      nombres.forEach((el, i) => {
        const nombre = el.value.trim();
        if (nombre) this.datos.metas.push({
          id: 'meta_' + (i + 1),
          nombre,
          objetivo:       parseFloat(objetivos[i].value) || 0,
          acumulado:      0,
          fecha_objetivo: fechas[i].value || null
        });
      });
    }
    return true;
  },

  error(msg) {
    const el = document.getElementById('ob-error');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  },

  async finalizar() {
    // Guardar todo en Store
    Store.setPerfil(this.datos.perfil);
    Store.setSupuestos(this.datos.supuestos);
    Store.setIngresos(this.datos.ingresos);
    Store.setGastosFijos(this.datos.gastos_fijos);
    Store.setDeudas(this.datos.deudas);
    Store.setMetas(this.datos.metas);

    // Saldo inicial
    const saldo = this.datos.ingresos.reduce((s, i) => s + i.monto, 0)
      - this.datos.gastos_fijos.reduce((s, g) => {
          const uf = this.datos.supuestos.uf || 0;
          return s + (g.es_uf ? g.monto_uf * uf : g.monto);
        }, 0);
    Store.addMovimiento({
      fecha: new Date().toISOString().slice(0, 10),
      tipo: 'Saldo inicial',
      categoria: 'Apertura',
      descripcion: 'Saldo disponible estimado del mes',
      monto: saldo,
      destino: null
    });

    Store.setOnboardingDone();

    // Subir datos iniciales a la nube (si hay sesión OAuth activa)
    if (typeof Cloud !== 'undefined' && Cloud.isReady()) {
      await Cloud.save();
    }

    // Ocultar onboarding y lanzar app
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app').style.visibility = 'visible';
    App.init();
  }
};
