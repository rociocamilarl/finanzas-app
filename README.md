# Controller Financiero — Rocío

App web personal para registro financiero diario. Reemplaza la edición manual del archivo `finanzas_rocio.xlsx`.

## Acceso rápido

📱 **[Abrir app →](https://TU_USUARIO.github.io/finanzas-web)**  
*(reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub una vez publicado)*

---

## Datos iniciales (al 29-06-2026)

| Concepto | Valor |
|---|---|
| Ingresos mensuales | $2.658.438 |
| Gastos fijos | ~$1.720.767 (varía con UF) |
| Saldo disponible | ~$937.671 |
| UF | $40.817,59 |
| GBP/CLP | $1.222,45 |
| Fondo Solidario total | $12.995.978 |
| Fondo Solidario prioritario (excl. LP) | $4.453.871 |
| Meta Birmingham | $9.437.314 |

---

## Uso día a día

### Registrar un gasto
1. Abre la app en el celular.
2. Toca **➕ Registrar** (segunda pestaña).
3. Completa fecha, tipo `Gasto`, categoría, descripción y monto.
4. Toca **Guardar movimiento**.

**Atajos rápidos** (debajo del formulario): toca directamente 🏦 Solidario, ✈️ Birmingham, 🛒 Super, etc. para prellenar el formulario — solo falta el monto.

### Registrar un abono al Fondo Solidario
- Opción A: En **➕ Registrar** → tipo `Pago` → categoría `Fondo Solidario` → destino `Fondo Solidario`.
- Opción B (más rápido): En **🏦 Deudas** → formulario "Registrar abono" → ingresas fecha y monto → el sistema imputa automáticamente al tramo más antiguo primero (MO-2024 → MO-2025 → CP-2026, LP excluido).

### Registrar ahorro para Birmingham
- En **🎯 Metas** → campo "Depositar CLP" bajo Birmingham → **+ Ahorro**.
- O desde **➕ Registrar** → tipo `Ahorro` → destino `Birmingham`.

### Ver el resumen del mes
- Pestaña **📊 Resumen**: ingresos, gastos fijos, saldo disponible, plan de asignación, avance de metas.

### Navegar meses anteriores
- Pestaña **📋 Flujo** → botones `‹` y `›` para cambiar de mes.

### Actualizar el valor de la UF (mensual)
1. Pestaña **⚙️ Config**.
2. Edita el campo "Valor UF" con el valor actual del SII/Banco Central.
3. Toca **Guardar cambios** — el dividendo de Sgto. Centro y la meta de emergencia se recalculan automáticamente.

### Exportar / hacer backup
- En **⚙️ Config** → **⬇️ Exportar JSON** → guarda el archivo en tu teléfono o Drive.

### Restaurar en otro dispositivo
- En **⚙️ Config** → campo "Importar JSON" → selecciona el archivo exportado.

---

## Reglas de imputación — Fondo Solidario

Los abonos se aplican **siempre al tramo más antiguo primero**:
1. MO-SOLIDARIO 2024 (vence 31-05-2025)
2. MO-SOLIDARIO 2025 (vence 31-05-2026)
3. CP-SOLIDARIO 2026 (vence 31-05-2027)
4. LP-SOLIDARIO → **excluido del plan** (probable condonación 2029, Ley 19.287)

**Marco legal (Ley 19.287):** pago anual = 5% renta año anterior · plazo máximo 15 años desde 2014 → condonación saldo remanente en 2029.

---

## Plan de asignación mensual

| Prioridad | Destino | Monto/mes |
|---|---|---|
| 1 | Fondo Solidario (MO+CP) | $575.183 |
| 2 | Birmingham | $362.488 |
| 3 | Emergencia | pausado |

Verificación Birmingham: 15 meses × $362.488 + $4.000.000 (venta depto ene-2027) ≈ meta $9.437.314.

---

## Estructura del proyecto

```
finanzas-web/
  index.html        ← app principal
  css/style.css     ← estilos mobile-first
  js/
    seed.js         ← datos iniciales del Excel
    store.js        ← persistencia en localStorage
    calc.js         ← cálculos financieros
    ui.js           ← renderizado de vistas
    app.js          ← navegación y eventos
  README.md
```

Los datos se guardan en **localStorage** del navegador. Para no perder nada, exporta un JSON regularmente desde Config.

---

## Publicar en GitHub Pages (primera vez)

```bash
# 1. Crea el repo en github.com (nombre sugerido: finanzas-web, privado)
# 2. Desde esta carpeta:
git init
git add .
git commit -m "Initial commit: controller financiero personal"
git remote add origin https://github.com/TU_USUARIO/finanzas-web.git
git push -u origin main

# 3. En GitHub → Settings → Pages → Branch: main → / (root) → Save
# 4. En ~2 minutos la app estará en https://TU_USUARIO.github.io/finanzas-web
```

---

*Datos basados en finanzas_rocio.xlsx · 29-06-2026*
