const Calc = {
  totalIngresos() {
    return Store.getIngresos().reduce((s, i) => s + i.monto, 0);
  },

  totalGastosFijos() {
    const sup = Store.getSupuestos();
    return Store.getGastosFijos().reduce((s, g) => {
      return s + (g.es_uf ? g.monto_uf * (sup.uf || 0) : g.monto);
    }, 0);
  },

  saldoDisponible() {
    return this.totalIngresos() - this.totalGastosFijos();
  },

  saldoTotalDeudas() {
    return Store.getDeudas().reduce((s, d) => s + d.saldo, 0);
  },

  aplicarAbono(deudaId, monto) {
    const deudas = Store.getDeudas();
    const deuda = deudas.find(d => d.id === deudaId);
    if (!deuda) return;
    if (deuda.tiene_tramos) {
      const tramos = (deuda.tramos || [])
        .filter(t => !t.excluido)
        .sort((a, b) => a.orden - b.orden);
      let resto = monto;
      for (const t of tramos) {
        if (resto <= 0) break;
        const idx = deuda.tramos.findIndex(x => x.id === t.id);
        if (deuda.tramos[idx].saldo <= resto) {
          resto -= deuda.tramos[idx].saldo;
          deuda.tramos[idx].saldo = 0;
        } else {
          deuda.tramos[idx].saldo -= resto;
          resto = 0;
        }
      }
      deuda.saldo = deuda.tramos.reduce((s, t) => s + t.saldo, 0);
    } else {
      deuda.saldo = Math.max(0, deuda.saldo - monto);
    }
    Store.setDeudas(deudas);
  },

  mesesHasta(fechaStr) {
    if (!fechaStr) return null;
    const hoy = new Date();
    const obj = new Date(fechaStr + '-01');
    return Math.max(0, (obj.getFullYear() - hoy.getFullYear()) * 12 + (obj.getMonth() - hoy.getMonth()));
  },

  porcentaje(actual, meta) {
    if (!meta) return 0;
    return Math.min(100, (actual / meta) * 100);
  },

  movimientosDelMes(año, mes) {
    const prefijo = `${año}-${String(mes).padStart(2, '0')}`;
    return Store.getMovimientos().filter(m => m.fecha.startsWith(prefijo));
  },

  alertas() {
    const alerts = [];
    const hoy = new Date();
    Store.getDeudas().forEach(d => {
      if (d.vencimiento && d.saldo > 0) {
        const venc = new Date(d.vencimiento);
        const dias = Math.round((venc - hoy) / 86400000);
        if (dias >= 0 && dias <= 30) alerts.push({ tipo: 'warning', msg: `Vence "${d.nombre}" en ${dias} días` });
        if (dias < 0) alerts.push({ tipo: 'danger', msg: `"${d.nombre}" está VENCIDA — saldo $${fmt(d.saldo)}` });
      }
    });
    return alerts;
  }
};

function fmt(n) {
  return Math.round(n).toLocaleString('es-CL');
}
