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
    const ingresos  = Calc.totalIngresos();
    const gastos    = Calc.totalGastosFijos();
    const saldo     = Calc.saldoDisponible();
    const saldoReal = Calc.saldoReal();
    const pctGasto  = Calc.porcentaje(gastos, ingresos);
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
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:0">
          <div><div class="stat-label">Ingresos</div><div class="stat-value green" style="font-size:14px">${this.clp(ingresos)}</div></div>
          <div><div class="stat-label">Gastos fijos</div><div class="stat-value red" style="font-size:14px">${this.clp(gastos)}</div></div>
          <div>
            <div class="stat-label">Saldo teórico</div>
            <div class="stat-value blue" style="font-size:14px">${this.clp(saldo)}</div>
            <div style="font-size:9px;color:var(--text-s);margin-top:2px">ingresos − gastos</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="stat-label">Saldo real en cuenta</div>
        <div class="card-big-number ${saldoReal < 0 ? 'red' : ''}">${this.clp(saldoReal)}</div>
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

    const hoy = new Date();

    // Calcular urgencia para ordenar: 0=vencida, 1=próxima (<30d), 2=pendiente, 3=saldada
    const urgencia = d => {
      if (d.saldo === 0) return 3;
      if (!d.vencimiento) return 2;
      const dias = Math.round((new Date(d.vencimiento) - hoy) / 86400000);
      if (dias < 0)  return 0;
      if (dias <= 30) return 1;
      return 2;
    };

    const sorted = [...deudas].sort((a, b) => urgencia(a) - urgencia(b));

    return sorted.map(d => {
      const pct  = Calc.porcentaje(d.original - d.saldo, d.original || d.saldo);
      const freq = d.frecuencia || 'mensual';
      const dias = d.vencimiento
        ? Math.round((new Date(d.vencimiento) - hoy) / 86400000)
        : null;

      // Badge según estado
      let badge, colorSaldo;
      if (d.saldo === 0) {
        badge = '<span class="badge badge-green">SALDADA</span>';
        colorSaldo = 'var(--success)';
      } else if (dias !== null && dias < 0) {
        badge = '<span class="badge badge-red">VENCIDA</span>';
        colorSaldo = 'var(--danger)';
      } else if (dias !== null && dias <= 30) {
        badge = `<span class="badge badge-orange">vence en ${dias}d</span>`;
        colorSaldo = 'var(--warning)';
      } else {
        badge = '<span class="badge badge-blue">al día</span>';
        colorSaldo = 'var(--warning)';
      }

      // Etiqueta de cuota según frecuencia
      const cuotaLabel = freq === 'anual' ? 'Pago anual' : freq === 'otra' ? 'Cuota' : 'Cuota mensual';

      // Botón de pago: para deudas anuales, solo mostrar si está próxima o vencida
      const mostrarPago = freq !== 'anual' || (dias !== null && dias <= 60);
      const placeholderPago = d.cuota
        ? `Abonar (sugerido: ${this.clp(d.cuota)})`
        : 'Monto a abonar...';

      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <span style="font-weight:700;font-size:15px">${d.nombre}</span>
              <span style="font-size:11px;color:var(--text-s);margin-left:6px">${freq}</span>
            </div>
            ${badge}
          </div>
          <div style="font-size:22px;font-weight:700;color:${colorSaldo}">${this.clp(d.saldo)}</div>
          ${d.cuota ? `<div class="card-sub">${cuotaLabel}: ${this.clp(d.cuota)}</div>` : ''}
          ${d.vencimiento ? `<div class="card-sub">Próximo vencimiento: ${this.fecha(d.vencimiento)}</div>` : ''}
          <div class="progress-wrap mt-4">
            ${this.progressBar(pct, pct >= 100 ? 'fill-green' : dias !== null && dias < 0 ? 'fill-red' : 'fill-blue')}
            <div style="font-size:11px;color:var(--text-s);margin-top:3px;text-align:right">${pct.toFixed(0)}% pagado</div>
          </div>
          ${mostrarPago ? `
          <form class="form-abono form-section" data-id="${d.id}" style="margin-top:12px">
            <div style="display:flex;gap:8px">
              <input type="number" class="form-input abono-monto" placeholder="${placeholderPago}" style="flex:1">
              <button type="submit" class="btn btn-primary btn-sm">Abonar</button>
            </div>
          </form>` : `
          <div style="margin-top:10px;font-size:12px;color:var(--text-s);text-align:center">
            El botón de pago aparecerá cuando se acerque el vencimiento (30 días antes)
          </div>`}
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
    const ing    = Store.getIngresos();
    const gastos = Store.getGastosFijos();
    const deudas = Store.getDeudas();
    const metas  = Store.getMetas();

    return `
      <!-- Perfil -->
      <div class="card">
        <div class="card-title">👤 Perfil</div>
        <div class="form-group"><label class="form-label">Nombre</label>
          <input class="form-input" id="cfg-nombre" value="${perfil.nombre || ''}"></div>
        <div class="form-group"><label class="form-label">Email</label>
          <input class="form-input" id="cfg-email" type="email" value="${perfil.email || ''}"></div>
        <button class="btn btn-primary cfg-save" data-sec="perfil" style="margin-top:4px">Guardar perfil</button>
      </div>

      <!-- Parámetros -->
      <div class="card">
        <div class="card-title">⚙️ Parámetros</div>
        <div class="config-row"><span class="config-label">Usa UF</span>
          <input type="checkbox" id="cfg-usa-uf" ${sup.usa_uf?'checked':''}></div>
        <div id="cfg-uf-row" style="${sup.usa_uf?'':'display:none'}">
          <div class="config-row"><span class="config-label">Valor UF</span>
            <input type="number" class="config-input" id="cfg-uf" value="${sup.uf||''}" step="0.01"></div>
        </div>
        <div class="config-row" style="margin-top:8px"><span class="config-label">Usa tipo cambio</span>
          <input type="checkbox" id="cfg-usa-tc" ${sup.usa_tipo_cambio?'checked':''}></div>
        <div id="cfg-tc-row" style="${sup.usa_tipo_cambio?'':'display:none'}">
          <div class="config-row"><span class="config-label">Moneda</span>
            <input class="config-input" id="cfg-tc-label" value="${sup.tipo_cambio_label||''}"></div>
          <div class="config-row"><span class="config-label">Valor CLP</span>
            <input type="number" class="config-input" id="cfg-tc" value="${sup.tipo_cambio||''}" step="0.01"></div>
        </div>
        <button class="btn btn-primary cfg-save" data-sec="supuestos" style="margin-top:12px">Guardar parámetros</button>
      </div>

      <!-- Ingresos -->
      <div class="card">
        <div class="card-title">💰 Ingresos mensuales</div>
        <div id="cfg-ing-list">
          ${ing.map((it, i) => `
            <div class="cfg-item-row" data-i="${i}">
              <div style="display:flex;gap:8px;align-items:center">
                <input class="form-input cfg-ing-concepto" value="${it.concepto}" style="flex:1" placeholder="Concepto">
                <button class="btn btn-danger btn-sm cfg-del-ing" data-i="${i}">✕</button>
              </div>
              <input class="form-input cfg-ing-monto" type="number" value="${it.monto}" placeholder="Monto CLP" style="margin-top:6px">
            </div>`).join('')}
        </div>
        <button class="btn btn-outline cfg-add" data-list="cfg-ing-list" data-tpl="ing" style="margin-top:8px">+ Agregar ingreso</button>
        <button class="btn btn-primary cfg-save" data-sec="ingresos" style="margin-top:8px">Guardar ingresos</button>
      </div>

      <!-- Gastos fijos -->
      <div class="card">
        <div class="card-title">💸 Gastos fijos mensuales</div>
        <div id="cfg-gasto-list">
          ${gastos.map((g, i) => `
            <div class="cfg-item-row" data-i="${i}">
              <div style="display:flex;gap:8px;align-items:center">
                <input class="form-input cfg-g-concepto" value="${g.concepto}" style="flex:1" placeholder="Concepto">
                <button class="btn btn-danger btn-sm cfg-del-gasto" data-i="${i}">✕</button>
              </div>
              <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
                ${sup.usa_uf ? `<label style="font-size:12px;display:flex;gap:4px;align-items:center;white-space:nowrap">
                  <input type="checkbox" class="cfg-g-esuf" ${g.es_uf?'checked':''}> en UF</label>` : ''}
                <input class="form-input cfg-g-monto" type="number" value="${g.es_uf?(g.monto_uf||0):g.monto}" placeholder="Monto" style="flex:1">
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-outline cfg-add" data-list="cfg-gasto-list" data-tpl="gasto" style="margin-top:8px">+ Agregar gasto</button>
        <button class="btn btn-primary cfg-save" data-sec="gastos" style="margin-top:8px">Guardar gastos</button>
      </div>

      <!-- Deudas -->
      <div class="card">
        <div class="card-title">🏦 Deudas</div>
        <div id="cfg-deuda-list">
          ${deudas.map((d, i) => `
            <div class="cfg-item-row" data-i="${i}" data-id="${d.id}">
              <div style="display:flex;gap:8px;align-items:center">
                <input class="form-input cfg-d-nombre" value="${d.nombre}" style="flex:1" placeholder="Nombre deuda">
                <button class="btn btn-danger btn-sm cfg-del-deuda" data-i="${i}">✕</button>
              </div>
              <div style="display:flex;gap:8px;margin-top:6px">
                <div style="flex:1"><label class="form-label">Saldo</label>
                  <input class="form-input cfg-d-saldo" type="number" value="${d.saldo}"></div>
                <div style="flex:1"><label class="form-label">Frecuencia</label>
                  <select class="form-input cfg-d-freq">
                    <option value="mensual" ${(d.frecuencia||'mensual')==='mensual'?'selected':''}>Mensual</option>
                    <option value="anual"   ${d.frecuencia==='anual'?'selected':''}>Anual</option>
                    <option value="otra"    ${d.frecuencia==='otra'?'selected':''}>Otra</option>
                  </select></div>
              </div>
              <div style="display:flex;gap:8px;margin-top:6px">
                <div style="flex:1"><label class="form-label">Cuota</label>
                  <input class="form-input cfg-d-cuota" type="number" value="${d.cuota||''}"></div>
                <div style="flex:1"><label class="form-label">Vencimiento</label>
                  <input class="form-input cfg-d-venc" type="date" value="${d.vencimiento||''}"></div>
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-outline cfg-add" data-list="cfg-deuda-list" data-tpl="deuda" style="margin-top:8px">+ Agregar deuda</button>
        <button class="btn btn-primary cfg-save" data-sec="deudas" style="margin-top:8px">Guardar deudas</button>
      </div>

      <!-- Metas -->
      <div class="card">
        <div class="card-title">🎯 Metas de ahorro</div>
        <div id="cfg-meta-list">
          ${metas.map((m, i) => `
            <div class="cfg-item-row" data-i="${i}" data-id="${m.id}">
              <div style="display:flex;gap:8px;align-items:center">
                <input class="form-input cfg-m-nombre" value="${m.nombre}" style="flex:1" placeholder="Nombre meta">
                <button class="btn btn-danger btn-sm cfg-del-meta" data-i="${i}">✕</button>
              </div>
              <div style="display:flex;gap:8px;margin-top:6px">
                <div style="flex:1"><label class="form-label">Objetivo (CLP)</label>
                  <input class="form-input cfg-m-objetivo" type="number" value="${m.objetivo||''}"></div>
                <div style="flex:1"><label class="form-label">Fecha objetivo</label>
                  <input class="form-input cfg-m-fecha" type="month" value="${m.fecha_objetivo||''}"></div>
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-outline cfg-add" data-list="cfg-meta-list" data-tpl="meta" style="margin-top:8px">+ Agregar meta</button>
        <button class="btn btn-primary cfg-save" data-sec="metas" style="margin-top:8px">Guardar metas</button>
      </div>

      <!-- Exportar / Importar -->
      <div class="card">
        <div class="card-title">📦 Exportar / Importar</div>
        <div class="form-section">
          <button class="btn btn-outline" id="btn-export">⬇️ Exportar JSON</button>
          <div><label class="form-label">Importar JSON</label>
            <input type="file" id="btn-import" accept=".json" class="form-input" style="padding:8px"></div>
        </div>
      </div>

      <div class="card">
        <button class="btn btn-outline" id="btn-logout">Cerrar sesión</button>
        <div class="divider" style="margin:12px 0"></div>
        <div class="card-title">⚠️ Zona de riesgo</div>
        <button class="btn btn-danger" id="btn-reset">Resetear todos los datos</button>
        <div class="text-muted" style="margin-top:6px">Borra todo y reinicia el onboarding.</div>
      </div>`;
  }
};
