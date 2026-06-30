const UI = {
  clp(n)  { return '$' + Math.round(n).toLocaleString('es-CL'); },
  pct(n)  { return n.toFixed(1) + '%'; },
  fecha(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  },
  mesNombre(año, mes) {
    return new Date(año, mes - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  },
  progressBar(pct, fillClass) {
    return `<div class="progress-bar"><div class="progress-fill ${fillClass}" style="width:${Math.min(100,pct)}%"></div></div>`;
  },
  tipoIcon(tipo) {
    const m = { Ingreso:'💰', Gasto:'💸', Pago:'🏦', Ahorro:'🎯', Transferencia:'↔️', 'Saldo inicial':'📌' };
    return m[tipo] || '•';
  },
  tipoDotClass(tipo) {
    const m = { Ingreso:'dot-ingreso', Gasto:'dot-gasto', Pago:'dot-pago', Ahorro:'dot-ahorro', Transferencia:'dot-transferencia', 'Saldo inicial':'dot-inicial' };
    return m[tipo] || 'dot-inicial';
  },

  // ── Dashboard ───────────────────────────────────────────────
  renderDashboard() {
    const perfil   = Store.getPerfil();
    const ingresos = Calc.totalIngresos();
    const gastos   = Calc.totalGastosFijos();
    const saldo    = Calc.saldoDisponible();
    const pctGasto = Calc.porcentaje(gastos, ingresos);
    const metas    = Store.getMetas();
    const deudas   = Store.getDeudas();
    const alertas  = Calc.alertas();
    const hoy      = new Date();

    const alertHtml = alertas.map(a =>
      `<div class="alert alert-${a.tipo}">
        <span class="alert-icon">${a.tipo === 'danger' ? '🚨' : '⚠️'}</span>
        <span>${a.msg}</span>
      </div>`
    ).join('');

    const metasHtml = metas.length ? metas.map(m => {
      const pct = Calc.porcentaje(m.acumulado, m.objetivo);
      const meses = m.fecha_objetivo ? Calc.mesesHasta(m.fecha_objetivo) : null;
      return `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:600">🎯 ${m.nombre}</span>
            <span class="text-muted">${meses !== null ? meses + ' meses' : ''}</span>
          </div>
          <div style="font-size:13px;margin-bottom:4px">
            ${this.clp(m.acumulado)} <span class="text-muted">/ ${this.clp(m.objetivo)}</span>
          </div>
          ${this.progressBar(pct, 'fill-blue')}
          <div style="font-size:11px;color:var(--text-s);margin-top:2px;text-align:right">${this.pct(pct)}</div>
        </div>`;
    }).join('<div class="divider"></div>')
    : '<div class="text-muted">Sin metas configuradas</div>';

    const deudasHtml = deudas.length ? deudas.map(d => `
      <li class="row-item">
        <span class="row-label">${d.nombre}</span>
        <span class="row-amount neg">${this.clp(d.saldo)}</span>
      </li>`).join('')
    : '<li class="row-item"><span class="text-muted">Sin deudas registradas</span></li>';

    return `
      ${alertHtml}
      <div class="card">
        <div class="card-title">Resumen · ${this.mesNombre(hoy.getFullYear(), hoy.getMonth()+1)}</div>
        <div class="stat-grid" style="margin-bottom:0">
          <div><div class="stat-label">Ingresos</div><div class="stat-value green" style="font-size:16px">${this.clp(ingresos)}</div></div>
          <div><div class="stat-label">Gastos fijos</div><div class="stat-value red" style="font-size:16px">${this.clp(gastos)}</div></div>
        </div>
        <div class="divider"></div>
        <div class="stat-label">Saldo disponible</div>
        <div class="card-big-number ${saldo < 0 ? 'red' : ''}">${this.clp(saldo)}</div>
        <div class="progress-wrap mt-4">
          <div class="progress-header"><span>% gasto / ingreso</span><span>${this.pct(pctGasto)}</span></div>
          ${this.progressBar(pctGasto, pctGasto > 80 ? 'fill-red' : pctGasto > 65 ? 'fill-orange' : 'fill-green')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Deudas</div>
        <ul class="row-list">${deudasHtml}</ul>
        ${deudas.length ? `<div class="divider"></div><div class="row-item" style="font-weight:700"><span>Total</span><span class="row-amount neg">${this.clp(Calc.saldoTotalDeudas())}</span></div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">Metas de ahorro</div>
        ${metasHtml}
      </div>`;
  },

  // ── Registro ────────────────────────────────────────────────
  renderRegistro() {
    const hoy    = new Date().toISOString().slice(0, 10);
    const deudas = Store.getDeudas();
    const metas  = Store.getMetas();
    const destOpts = [
      ...deudas.map(d => `<option value="deuda_${d.id}">Deuda: ${d.nombre}</option>`),
      ...metas.map(m  => `<option value="meta_${m.id}">Meta: ${m.nombre}</option>`)
    ].join('');

    return `
      <div class="card">
        <div class="card-title">Registrar movimiento</div>
        <form id="form-mov" class="form-section">
          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input type="date" class="form-input" id="f-fecha" value="${hoy}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-input" id="f-tipo" required>
              <option value="">— elegir —</option>
              <option value="Ingreso">💰 Ingreso</option>
              <option value="Gasto">💸 Gasto</option>
              <option value="Pago">🏦 Pago (deuda)</option>
              <option value="Ahorro">🎯 Ahorro (meta)</option>
              <option value="Transferencia">↔️ Transferencia</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select class="form-input" id="f-cat" required>
              <option value="">— elegir tipo primero —</option>
            </select>
          </div>
          <div class="form-group" id="grupo-destino" style="display:none">
            <label class="form-label">Imputar a</label>
            <select class="form-input" id="f-destino">
              <option value="">— ninguno —</option>
              ${destOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <input type="text" class="form-input" id="f-desc" placeholder="Descripción" required>
          </div>
          <div class="form-group">
            <label class="form-label">Monto (CLP)</label>
            <input type="number" class="form-input" id="f-monto" placeholder="0" min="1" required>
          </div>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </form>
      </div>`;
  },

  categoriasPorTipo: {
    Ingreso:       ['Sueldo', 'Arriendo', 'Bono', 'Devolución', 'Otro ingreso'],
    Gasto:         ['Supermercado', 'Farmacia', 'Salud', 'Restaurante', 'Ropa', 'Entretenimiento', 'Transporte', 'Gastos varios', 'Otro gasto'],
    Pago:          ['Deuda', 'Crédito', 'Dividendo', 'Otro pago'],
    Ahorro:        ['Meta ahorro', 'Fondo emergencia', 'Otro ahorro'],
    Transferencia: ['Entre cuentas', 'Otro']
  },

  // ── Flujo ───────────────────────────────────────────────────
  renderFlujo(año, mes) {
    const movs = Calc.movimientosDelMes(año, mes).slice().reverse();
    const items = movs.map(m => {
      const montoMostrar = (m.tipo === 'Gasto' || m.tipo === 'Pago' || m.tipo === 'Ahorro')
        ? -Math.abs(m.monto) : m.monto;
      const clsAmount = montoMostrar >= 0 ? 'pos' : 'neg';
      return `<div class="mov-item">
        <div class="mov-dot ${this.tipoDotClass(m.tipo)}">${this.tipoIcon(m.tipo)}</div>
        <div class="mov-body">
          <div class="mov-desc">${m.descripcion || m.categoria}</div>
          <div class="mov-meta">${this.fecha(m.fecha)} · ${m.categoria}</div>
        </div>
        <div class="mov-right">
          <span class="mov-amount ${clsAmount}">${montoMostrar >= 0 ? '+' : ''}${this.clp(montoMostrar)}</span>
          ${m.tipo !== 'Saldo inicial' ? `<button class="mov-delete" data-del="${m.id}">✕</button>` : ''}
        </div>
      </div>`;
    }).join('');

    return `
      <div class="month-nav">
        <button id="mes-prev">‹</button>
        <span class="month-label">${this.mesNombre(año, mes)}</span>
        <button id="mes-next">›</button>
      </div>
      <div class="card">
        ${movs.length ? `<div id="lista-movs">${items}</div>`
          : '<div class="empty-state"><div class="empty-icon">📭</div>Sin movimientos este mes</div>'}
      </div>`;
  },

  // ── Deudas ──────────────────────────────────────────────────
  renderDeudas() {
    const deudas = Store.getDeudas();
    if (!deudas.length) return `
      <div class="card">
        <div class="empty-state"><div class="empty-icon">🏦</div>Sin deudas registradas</div>
      </div>`;

    return deudas.map(d => {
      const pct = Calc.porcentaje(d.original - d.saldo, d.original || d.saldo);
      const badge = d.saldo === 0
        ? '<span class="badge badge-green">SALDADA</span>'
        : d.vencimiento && new Date(d.vencimiento) < new Date()
          ? '<span class="badge badge-red">VENCIDA</span>'
          : '<span class="badge badge-orange">pendiente</span>';
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-weight:700;font-size:15px">${d.nombre}</span>${badge}
          </div>
          <div style="font-size:22px;font-weight:700;color:var(--warning)">${this.clp(d.saldo)}</div>
          ${d.cuota ? `<div class="card-sub">Cuota mensual: ${this.clp(d.cuota)}</div>` : ''}
          ${d.vencimiento ? `<div class="card-sub">Vence: ${this.fecha(d.vencimiento)}</div>` : ''}
          <div class="progress-wrap mt-4">
            ${this.progressBar(pct, 'fill-blue')}
            <div style="font-size:11px;color:var(--text-s);margin-top:3px;text-align:right">${pct.toFixed(0)}% pagado</div>
          </div>
          <form class="form-abono form-section" data-id="${d.id}" style="margin-top:12px">
            <div style="display:flex;gap:8px">
              <input type="number" class="form-input abono-monto" placeholder="Registrar abono..." style="flex:1">
              <button type="submit" class="btn btn-primary btn-sm">Abonar</button>
            </div>
          </form>
        </div>`;
    }).join('');
  },

  // ── Metas ───────────────────────────────────────────────────
  renderMetas() {
    const metas = Store.getMetas();
    if (!metas.length) return `
      <div class="card">
        <div class="empty-state"><div class="empty-icon">🎯</div>Sin metas configuradas</div>
      </div>`;

    return metas.map(m => {
      const pct   = Calc.porcentaje(m.acumulado, m.objetivo);
      const meses = m.fecha_objetivo ? Calc.mesesHasta(m.fecha_objetivo) : null;
      return `
        <div class="card">
          <div class="card-title">🎯 ${m.nombre}</div>
          <div class="card-big-number">${this.clp(m.acumulado)}</div>
          <div class="card-sub">de ${this.clp(m.objetivo)}${meses !== null ? ` · ${meses} meses restantes` : ''}</div>
          <div class="progress-wrap mt-4">
            <div class="progress-header"><span>${this.pct(pct)}</span>${m.fecha_objetivo ? `<span>${m.fecha_objetivo}</span>` : ''}</div>
            ${this.progressBar(pct, 'fill-blue')}
          </div>
          <form class="form-ahorro form-section" data-id="${m.id}" style="margin-top:12px">
            <div style="display:flex;gap:8px">
              <input type="number" class="form-input ahorro-monto" placeholder="Depositar CLP..." style="flex:1">
              <button type="submit" class="btn btn-success btn-sm">+ Ahorro</button>
            </div>
          </form>
        </div>`;
    }).join('');
  },

  // ── Config ──────────────────────────────────────────────────
  renderConfig() {
    const sup    = Store.getSupuestos();
    const perfil = Store.getPerfil();
    const gastos = Store.getGastosFijos();

    return `
      <div class="card">
        <div class="card-title">Parámetros</div>
        ${sup.usa_uf ? `<div class="config-row"><span class="config-label">Valor UF</span><input type="number" class="config-input" id="cfg-uf" value="${sup.uf}" step="0.01"></div>` : ''}
        ${sup.usa_tipo_cambio ? `<div class="config-row"><span class="config-label">${sup.tipo_cambio_label}/CLP</span><input type="number" class="config-input" id="cfg-tc" value="${sup.tipo_cambio}" step="0.01"></div>` : ''}
        ${!sup.usa_uf && !sup.usa_tipo_cambio ? '<div class="text-muted">Sin parámetros variables configurados.</div>' : ''}
        ${sup.usa_uf || sup.usa_tipo_cambio ? '<button class="btn btn-primary" id="btn-save-cfg" style="margin-top:12px">Guardar cambios</button>' : ''}
      </div>

      <div class="card">
        <div class="card-title">Gastos fijos</div>
        <ul class="row-list">
          ${gastos.map(g => {
            const monto = g.es_uf ? g.monto_uf * (sup.uf || 0) : g.monto;
            return `<li class="row-item">
              <span class="row-label">${g.concepto}${g.es_uf ? ' <span class="chip">UF</span>' : ''}</span>
              <span class="row-amount neg">${this.clp(monto)}</span>
            </li>`;
          }).join('')}
          <li class="row-item" style="font-weight:700">
            <span>TOTAL</span><span class="row-amount neg">${this.clp(Calc.totalGastosFijos())}</span>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">Exportar / Importar</div>
        <div class="form-section">
          <button class="btn btn-outline" id="btn-export">⬇️ Exportar JSON</button>
          <div>
            <label class="form-label">Importar JSON</label>
            <input type="file" id="btn-import" accept=".json" class="form-input" style="padding:8px">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🔐 Cambiar contraseña</div>
        <form id="form-pass" class="form-section">
          <div class="form-group">
            <label class="form-label">Contraseña actual</label>
            <input type="password" class="form-input" id="pass-actual" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label class="form-label">Nueva contraseña</label>
            <input type="password" class="form-input" id="pass-nueva" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar</label>
            <input type="password" class="form-input" id="pass-confirmar" placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary">Cambiar contraseña</button>
        </form>
        <div class="divider" style="margin-top:12px"></div>
        <button class="btn btn-outline" id="btn-logout" style="margin-top:12px">Cerrar sesión</button>
      </div>

      <div class="card">
        <div class="card-title">⚠️ Zona de riesgo</div>
        <button class="btn btn-danger" id="btn-reset">Resetear todos los datos</button>
        <div class="text-muted" style="margin-top:6px">Borra todo y reinicia el onboarding.</div>
      </div>`;
  }
};
