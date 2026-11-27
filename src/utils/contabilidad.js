// ==========================================
// PIXELCRAFT 3D - MOTOR CONTABLE
// Regla societaria:
// - 30% de cada venta va a Caja PixelCraft
// - 35% Aldo Dante / 35% Alejandro Ruiz (intactos)
// - Todos los gastos del taller se descuentan de Caja PixelCraft
// ==========================================

export const CATEGORIAS_GASTO = [
  { id: 'Filamento', label: 'Filamento', icono: '🧵', color: '#00d4ff' },
  { id: 'Luz (EJESA)', label: 'Luz (EJESA)', icono: '⚡', color: '#facc15' },
  { id: 'Repuestos / Service', label: 'Repuestos / Service', icono: '🔧', color: '#fb923c' },
  { id: 'Insumos LED / Cartelería', label: 'Insumos LED / Cartelería', icono: '💡', color: '#c084fc' },
  { id: 'Packaging / Envíos', label: 'Packaging / Envíos', icono: '📦', color: '#38bdf8' },
  { id: 'Herramientas / Equipo', label: 'Herramientas / Equipo', icono: '🛠️', color: '#34d399' },
  { id: 'Publicidad / Otros', label: 'Publicidad / Otros', icono: '📌', color: '#94a3b8' },
];

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const obtenerHoyISO = () => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatearFechaARDesdeISO = (fechaISO) => {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
    return new Date().toLocaleDateString('es-AR');
  }
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Normaliza la fecha de una venta o gasto a `YYYY-MM-DD` (hora local),
 * manteniendo compatibilidad con registros antiguos que solo tienen `fecha` (DD/MM/YYYY) o `id`.
 */
export const obtenerFechaISO = (item) => {
  if (!item) return obtenerHoyISO();

  if (typeof item.fechaISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.fechaISO)) {
    return item.fechaISO;
  }

  if (typeof item.fecha === 'string') {
    const matchAR = item.fecha.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchAR) {
      const d = matchAR[1].padStart(2, '0');
      const m = matchAR[2].padStart(2, '0');
      const y = matchAR[3];
      return `${y}-${m}-${d}`;
    }
  }

  if (typeof item.id === 'number' && Number.isFinite(item.id)) {
    const dt = new Date(item.id);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return obtenerHoyISO();
};

export const obtenerClaveMes = (item) => obtenerFechaISO(item).slice(0, 7);

export const formatearClaveMes = (claveMes) => {
  if (!claveMes || claveMes === 'todos') return 'Todo el histórico';
  const [y, m] = claveMes.split('-');
  const idx = parseInt(m, 10) - 1;
  const nombreMes = MESES_ES[idx] || m;
  return `${nombreMes} ${y}`;
};

export const listarMesesDisponibles = (ventas = [], gastos = []) => {
  const setMeses = new Set([obtenerHoyISO().slice(0, 7)]);
  ventas.forEach((v) => setMeses.add(obtenerClaveMes(v)));
  gastos.forEach((g) => setMeses.add(obtenerClaveMes(g)));

  return Array.from(setMeses)
    .sort((a, b) => b.localeCompare(a))
    .map((clave) => ({ clave, label: formatearClaveMes(clave) }));
};

export const obtenerAporteCajaVenta = (v) => {
  const cobrado = parseFloat(v.precioTotal) || 0;
  return v.cajaPixelCraft !== undefined ? Number(v.cajaPixelCraft) || 0 : cobrado * 0.30;
};

export const obtenerSocio1Venta = (v) => {
  const cobrado = parseFloat(v.precioTotal) || 0;
  return v.socioA !== undefined ? Number(v.socioA) || 0 : cobrado * 0.35;
};

export const obtenerSocio2Venta = (v) => {
  const cobrado = parseFloat(v.precioTotal) || 0;
  return v.socioB !== undefined ? Number(v.socioB) || 0 : cobrado * 0.35;
};

export const calcularResumenContable = ({ ventas = [], gastos = [], periodo = 'todos' }) => {
  const ventasFiltradas =
    periodo === 'todos' ? ventas : ventas.filter((v) => obtenerClaveMes(v) === periodo);
  const gastosFiltrados =
    periodo === 'todos' ? gastos : gastos.filter((g) => obtenerClaveMes(g) === periodo);

  // Totales del período seleccionado
  const totalFacturado = ventasFiltradas.reduce((acc, v) => acc + (parseFloat(v.precioTotal) || 0), 0);
  const aporteCaja30 = ventasFiltradas.reduce((acc, v) => acc + obtenerAporteCajaVenta(v), 0);
  const totalSocio1 = ventasFiltradas.reduce((acc, v) => acc + obtenerSocio1Venta(v), 0);
  const totalSocio2 = ventasFiltradas.reduce((acc, v) => acc + obtenerSocio2Venta(v), 0);
  const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
  const saldoCajaPeriodo = aporteCaja30 - totalGastos;

  // Saldo real acumulado en Caja PixelCraft (histórico completo)
  const aporteCajaHistorico = ventas.reduce((acc, v) => acc + obtenerAporteCajaVenta(v), 0);
  const gastosHistorico = gastos.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
  const saldoCajaHistorico = aporteCajaHistorico - gastosHistorico;

  // Desglose de gastos por categoría en el período
  const mapaCategorias = new Map();
  gastosFiltrados.forEach((g) => {
    const cat = g.categoria || 'Publicidad / Otros';
    mapaCategorias.set(cat, (mapaCategorias.get(cat) || 0) + (parseFloat(g.monto) || 0));
  });

  const gastosPorCategoria = Array.from(mapaCategorias.entries())
    .map(([categoria, monto]) => {
      const meta = CATEGORIAS_GASTO.find((c) => c.id === categoria) || CATEGORIAS_GASTO[CATEGORIAS_GASTO.length - 1];
      return {
        categoria,
        icono: meta.icono,
        color: meta.color,
        monto,
        porcentaje: totalGastos > 0 ? (monto / totalGastos) * 100 : 0,
      };
    })
    .sort((a, b) => b.monto - a.monto);

  // Evolución mensual (todos los meses con movimientos)
  const mapaMeses = new Map();
  const asegurarMes = (clave) => {
    if (!mapaMeses.has(clave)) {
      mapaMeses.set(clave, {
        clave,
        label: formatearClaveMes(clave),
        ingresos: 0,
        cantidadVentas: 0,
        aporteCaja30: 0,
        gastos: 0,
        cantidadGastos: 0,
        socio1: 0,
        socio2: 0,
      });
    }
    return mapaMeses.get(clave);
  };

  ventas.forEach((v) => {
    const row = asegurarMes(obtenerClaveMes(v));
    row.ingresos += parseFloat(v.precioTotal) || 0;
    row.cantidadVentas += 1;
    row.aporteCaja30 += obtenerAporteCajaVenta(v);
    row.socio1 += obtenerSocio1Venta(v);
    row.socio2 += obtenerSocio2Venta(v);
  });

  gastos.forEach((g) => {
    const row = asegurarMes(obtenerClaveMes(g));
    row.gastos += parseFloat(g.monto) || 0;
    row.cantidadGastos += 1;
  });

  const resumenMensual = Array.from(mapaMeses.values())
    .map((m) => ({
      ...m,
      saldoCajaMes: m.aporteCaja30 - m.gastos,
    }))
    .sort((a, b) => b.clave.localeCompare(a.clave));

  return {
    ventasFiltradas,
    gastosFiltrados,
    totalFacturado,
    aporteCaja30,
    totalSocio1,
    totalSocio2,
    totalGastos,
    saldoCajaPeriodo,
    saldoCajaHistorico,
    gastosPorCategoria,
    resumenMensual,
  };
};
