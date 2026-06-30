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
    document.getElementById('btn-save-cfg')?.addEventListener('click', () => {
      const sup = Store.getSupuestos();
      if (sup.usa_uf) sup.uf = parseFloat(document.getElementById('cfg-uf').value) || sup.uf;
      if (sup.usa_tipo_cambio) sup.tipo_cambio = parseFloat(document.getElementById('cfg-tc').value) || sup.tipo_cambio;
      Store.setSupuestos(sup);
      this.toast('✓ Parámetros actualizados');
      this.render();
    });

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

    document.getElementById('form-pass').addEventListener('submit', async e => {
      e.preventDefault();
      const actual    = document.getElementById('pass-actual').value;
      const nueva     = document.getElementById('pass-nueva').value;
      const confirmar = document.getElementById('pass-confirmar').value;
      if (nueva.length < 6)   { this.toast('Mínimo 6 caracteres'); return; }
      if (nueva !== confirmar) { this.toast('Las contraseñas no coinciden'); return; }
      const ok = await Auth.changePassword(actual, nueva);
      if (ok) { this.toast('✓ Contraseña actualizada'); document.getElementById('pass-actual').value = document.getElementById('pass-nueva').value = document.getElementById('pass-confirmar').value = ''; }
      else    { this.toast('Contraseña actual incorrecta'); }
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
