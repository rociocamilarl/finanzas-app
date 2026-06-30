const App = {
  vista: 'dashboard',
  flujoAño: new Date().getFullYear(),
  flujoMes: new Date().getMonth() + 1,

  init() {
    Store.init();
    // Actualizar header con nombre del usuario
    const perfil = Store.getPerfil();
    if (perfil.nombre) {
      document.getElementById('header-nombre').textContent = perfil.nombre;
    }
    this.render();
    this.bindNav();
  },

  render() {
    const content = document.getElementById('main-content');
    switch (this.vista) {
      case 'dashboard': content.innerHTML = UI.renderDashboard(); break;
      case 'registro':  content.innerHTML = UI.renderRegistro();  this.bindRegistro(); break;
      case 'flujo':     content.innerHTML = UI.renderFlujo(this.flujoAño, this.flujoMes); this.bindFlujo(); break;
      case 'deudas':    content.innerHTML = UI.renderDeudas();    this.bindDeudas(); break;
      case 'metas':     content.innerHTML = UI.renderMetas();     this.bindMetas(); break;
      case 'config':    content.innerHTML = UI.renderConfig();    this.bindConfig(); break;
    }
    document.getElementById('main-content').scrollTop = 0;
  },

  bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.vista = btn.dataset.view;
        this.render();
      });
    });
  },

  bindRegistro() {
    const tipoSel = document.getElementById('f-tipo');
    const catSel  = document.getElementById('f-cat');
    const destGrp = document.getElementById('grupo-destino');

    tipoSel.addEventListener('change', () => {
      const cats = UI.categoriasPorTipo[tipoSel.value] || [];
      catSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
      destGrp.style.display = (tipoSel.value === 'Pago' || tipoSel.value === 'Ahorro') ? 'flex' : 'none';
    });

    document.getElementById('form-mov').addEventListener('submit', e => {
      e.preventDefault();
      const tipo    = document.getElementById('f-tipo').value;
      const cat     = document.getElementById('f-cat').value;
      const desc    = document.getElementById('f-desc').value.trim();
      const monto   = parseFloat(document.getElementById('f-monto').value);
      const fecha   = document.getElementById('f-fecha').value;
      const destino = document.getElementById('f-destino')?.value || null;

      if (!tipo || !cat || !desc || !monto || !fecha) { this.toast('Completa todos los campos'); return; }

      const montoFinal = (tipo === 'Gasto' || tipo === 'Pago' || tipo === 'Ahorro')
        ? -Math.abs(monto) : Math.abs(monto);

      Store.addMovimiento({ fecha, tipo, categoria: cat, descripcion: desc, monto: montoFinal, destino });

      // Abonar a deuda si aplica
      if (destino && destino.startsWith('deuda_')) {
        const id = destino.replace('deuda_', '');
        Calc.aplicarAbono(id, Math.abs(monto));
      }

      // Acumular en meta si aplica
      if (destino && destino.startsWith('meta_')) {
        const metas = Store.getMetas();
        const id = destino.replace('meta_', '');
        const idx = metas.findIndex(m => m.id === id);
        if (idx >= 0) { metas[idx].acumulado += Math.abs(monto); Store.setMetas(metas); }
      }

      this.toast('✓ Movimiento guardado');
      document.getElementById('f-desc').value = '';
      document.getElementById('f-monto').value = '';
    });
  },

  bindFlujo() {
    document.getElementById('mes-prev').addEventListener('click', () => {
      this.flujoMes--;
      if (this.flujoMes < 1) { this.flujoMes = 12; this.flujoAño--; }
      this.render();
    });
    document.getElementById('mes-next').addEventListener('click', () => {
      this.flujoMes++;
      if (this.flujoMes > 12) { this.flujoMes = 1; this.flujoAño++; }
      this.render();
    });
    document.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('¿Eliminar este movimiento?')) return;
        Store.deleteMovimiento(parseInt(btn.dataset.del));
        this.render();
        this.toast('Eliminado');
      });
    });
  },

  bindDeudas() {
    document.querySelectorAll('.form-abono').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const id    = form.dataset.id;
        const monto = parseFloat(form.querySelector('.abono-monto').value);
        if (!monto) return;
        Calc.aplicarAbono(id, monto);
        Store.addMovimiento({
          fecha: new Date().toISOString().slice(0, 10),
          tipo: 'Pago', categoria: 'Deuda',
          descripcion: 'Abono deuda',
          monto: -monto, destino: 'deuda_' + id
        });
        this.toast('✓ Abono registrado');
        this.render();
      });
    });
  },

  bindMetas() {
    document.querySelectorAll('.form-ahorro').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const id    = form.dataset.id;
        const monto = parseFloat(form.querySelector('.ahorro-monto').value);
        if (!monto) return;
        const metas = Store.getMetas();
        const idx   = metas.findIndex(m => m.id === id);
        if (idx >= 0) { metas[idx].acumulado += monto; Store.setMetas(metas); }
        Store.addMovimiento({
          fecha: new Date().toISOString().slice(0, 10),
          tipo: 'Ahorro', categoria: 'Meta',
          descripcion: 'Ahorro ' + (metas[idx]?.nombre || ''),
          monto: -monto, destino: 'meta_' + id
        });
        this.toast('✓ Ahorro registrado');
        this.render();
      });
    });
  },

  bindConfig() {
    const sup = Store.getSupuestos();

    // Toggle filas UF / tipo cambio
    document.getElementById('cfg-usa-uf')?.addEventListener('change', e => {
      document.getElementById('cfg-uf-row').style.display = e.target.checked ? '' : 'none';
    });
    document.getElementById('cfg-usa-tc')?.addEventListener('change', e => {
      document.getElementById('cfg-tc-row').style.display = e.target.checked ? '' : 'none';
    });

    // Botones "Guardar [sección]"
    document.querySelectorAll('.cfg-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.dataset.sec;

        if (sec === 'perfil') {
          Store.setPerfil({
            ...Store.getPerfil(),
            nombre: document.getElementById('cfg-nombre').value.trim(),
            email:  document.getElementById('cfg-email').value.trim()
          });
          this.toast('✓ Perfil actualizado');
        }

        if (sec === 'supuestos') {
          const usaUF = document.getElementById('cfg-usa-uf').checked;
          const usaTC = document.getElementById('cfg-usa-tc').checked;
          Store.setSupuestos({
            ...sup,
            usa_uf:           usaUF,
            uf:               usaUF ? parseFloat(document.getElementById('cfg-uf').value) || sup.uf : sup.uf,
            usa_tipo_cambio:  usaTC,
            tipo_cambio_label: usaTC ? document.getElementById('cfg-tc-label').value.trim() : sup.tipo_cambio_label,
            tipo_cambio:      usaTC ? parseFloat(document.getElementById('cfg-tc').value) || sup.tipo_cambio : sup.tipo_cambio
          });
          this.toast('✓ Parámetros actualizados');
          this.render();
        }

        if (sec === 'ingresos') {
          const items = [];
          document.querySelectorAll('#cfg-ing-list .cfg-item-row').forEach((row, i) => {
            const concepto = row.querySelector('.cfg-ing-concepto').value.trim();
            const monto    = parseFloat(row.querySelector('.cfg-ing-monto').value) || 0;
            if (concepto) items.push({ id: i + 1, concepto, monto });
          });
          Store.setIngresos(items);
          this.toast('✓ Ingresos actualizados');
        }

        if (sec === 'gastos') {
          const items = [];
          document.querySelectorAll('#cfg-gasto-list .cfg-item-row').forEach((row, i) => {
            const concepto = row.querySelector('.cfg-g-concepto').value.trim();
            const esUF     = row.querySelector('.cfg-g-esuf')?.checked || false;
            const val      = parseFloat(row.querySelector('.cfg-g-monto').value) || 0;
            if (concepto) items.push({ id: i + 1, concepto, es_uf: esUF, monto: esUF ? 0 : val, monto_uf: esUF ? val : 0 });
          });
          Store.setGastosFijos(items);
          this.toast('✓ Gastos actualizados');
        }

        if (sec === 'deudas') {
          const items = [];
          document.querySelectorAll('#cfg-deuda-list .cfg-item-row').forEach(row => {
            const nombre = row.querySelector('.cfg-d-nombre').value.trim();
            if (!nombre) return;
            const saldo = parseFloat(row.querySelector('.cfg-d-saldo').value) || 0;
            const existId = row.dataset.id;
            const existing = Store.getDeudas().find(d => d.id === existId);
            items.push({
              id:          existId || 'deuda_' + Date.now(),
              nombre,
              saldo,
              original:    existing?.original || saldo,
              cuota:       parseFloat(row.querySelector('.cfg-d-cuota').value) || 0,
              vencimiento: row.querySelector('.cfg-d-venc').value || null,
              frecuencia:  row.querySelector('.cfg-d-freq').value || 'mensual',
              tiene_tramos: existing?.tiene_tramos || false
            });
          });
          Store.setDeudas(items);
          this.toast('✓ Deudas actualizadas');
        }

        if (sec === 'metas') {
          const items = [];
          document.querySelectorAll('#cfg-meta-list .cfg-item-row').forEach(row => {
            const nombre = row.querySelector('.cfg-m-nombre').value.trim();
            if (!nombre) return;
            const existId  = row.dataset.id;
            const existing = Store.getMetas().find(m => m.id === existId);
            items.push({
              id:            existId || 'meta_' + Date.now(),
              nombre,
              objetivo:      parseFloat(row.querySelector('.cfg-m-objetivo').value) || 0,
              acumulado:     existing?.acumulado || 0,
              fecha_objetivo: row.querySelector('.cfg-m-fecha').value || null
            });
          });
          Store.setMetas(items);
          this.toast('✓ Metas actualizadas');
        }
      });
    });

    // Botones "+ Agregar" en Config (inserción directa sin re-render)
    document.querySelectorAll('.cfg-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const lista = document.getElementById(btn.dataset.list);
        const tpl   = btn.dataset.tpl;
        const div   = document.createElement('div');
        div.className = 'cfg-item-row';

        if (tpl === 'ing') div.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center">
            <input class="form-input cfg-ing-concepto" style="flex:1" placeholder="Concepto">
            <button class="btn btn-danger btn-sm cfg-del-ing">✕</button>
          </div>
          <input class="form-input cfg-ing-monto" type="number" placeholder="Monto CLP" style="margin-top:6px">`;

        if (tpl === 'gasto') div.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center">
            <input class="form-input cfg-g-concepto" style="flex:1" placeholder="Concepto">
            <button class="btn btn-danger btn-sm cfg-del-gasto">✕</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <input class="form-input cfg-g-monto" type="number" placeholder="Monto CLP" style="flex:1">
          </div>`;

        if (tpl === 'deuda') div.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center">
            <input class="form-input cfg-d-nombre" style="flex:1" placeholder="Nombre deuda">
            <button class="btn btn-danger btn-sm cfg-del-deuda">✕</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <div style="flex:1"><label class="form-label">Saldo</label>
              <input class="form-input cfg-d-saldo" type="number" value="0"></div>
            <div style="flex:1"><label class="form-label">Frecuencia</label>
              <select class="form-input cfg-d-freq">
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
                <option value="otra">Otra</option>
              </select></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <div style="flex:1"><label class="form-label">Cuota</label>
              <input class="form-input cfg-d-cuota" type="number" value="0"></div>
            <div style="flex:1"><label class="form-label">Vencimiento</label>
              <input class="form-input cfg-d-venc" type="date"></div>
          </div>`;

        if (tpl === 'meta') div.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center">
            <input class="form-input cfg-m-nombre" style="flex:1" placeholder="Nombre meta">
            <button class="btn btn-danger btn-sm cfg-del-meta">✕</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <div style="flex:1"><label class="form-label">Objetivo (CLP)</label>
              <input class="form-input cfg-m-objetivo" type="number" value="0"></div>
            <div style="flex:1"><label class="form-label">Fecha objetivo</label>
              <input class="form-input cfg-m-fecha" type="month"></div>
          </div>`;

        lista.appendChild(div);
        div.querySelector('[class*="cfg-del"]')?.addEventListener('click', () => div.remove());
      });
    });

    // Botones eliminar en filas existentes
    document.querySelectorAll('[class*="cfg-del-"]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.cfg-item-row').remove());
    });

    // Exportar / Importar
    document.getElementById('btn-export').addEventListener('click', () => {
      const blob = new Blob([Store.exportar()], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `finanzas_${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      this.toast('✓ Datos exportados');
    });

    document.getElementById('btn-import').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try { Store.importar(ev.target.result); this.toast('✓ Datos importados'); this.render(); }
        catch { this.toast('Error: JSON inválido'); }
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      if (!confirm('¿Cerrar sesión?')) return;
      Auth.logout();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (!confirm('¿Resetear TODO? Esto borrará todos tus datos y reiniciará el proceso de configuración.')) return;
      Store.resetear();
      location.reload();
    });
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
};
