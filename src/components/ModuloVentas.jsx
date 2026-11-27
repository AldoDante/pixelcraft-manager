import React, { useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { redondearPrecioCliente } from '../utils/calculos';
import {
  CATEGORIAS_GASTO,
  calcularResumenContable,
  formatearClaveMes,
  formatearFechaARDesdeISO,
  listarMesesDisponibles,
  obtenerAporteCajaVenta,
  obtenerHoyISO,
  obtenerSocio1Venta,
  obtenerSocio2Venta,
} from '../utils/contabilidad';
import ModalGasto from './ModalGasto';

const crearEstadoInicialVenta = (proyectoInicial) => {
  const hoyISO = obtenerHoyISO();
  if (!proyectoInicial) {
    return {
      fechaISO: hoyISO,
      proyectoSeleccionado: '',
      nombreCliente: '',
      cantidad: 1,
      precioVentaManual: '',
      metodoPago: 'Transferencia',
    };
  }

  const precioSugerido = redondearPrecioCliente(proyectoInicial.precioVenta);
  return {
    fechaISO: hoyISO,
    proyectoSeleccionado: proyectoInicial.firestoreId || '',
    nombreCliente: proyectoInicial.clienteNombre || '',
    cantidad: 1,
    precioVentaManual: precioSugerido > 0 ? String(precioSugerido) : '',
    metodoPago: 'Transferencia',
  };
};

function ModuloVentas({
  ventas = [],
  gastos = [],
  proyectos = [],
  nombreEmisor = 'PixelCraft 3D',
  proyectoInicial = null,
  onCerrarModalInicial,
}) {
  const [modalVentaAbierto, setModalVentaAbierto] = useState(Boolean(proyectoInicial));
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [subTab, setSubTab] = useState('ventas'); // 'ventas' | 'gastos' | 'balance'
  const [periodo, setPeriodo] = useState('todos'); // 'todos' | 'YYYY-MM'
  const [ventaForm, setVentaForm] = useState(() => crearEstadoInicialVenta(proyectoInicial));

  const formatoMoneda = (val) =>
    (val || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const mesesDisponibles = useMemo(
    () => listarMesesDisponibles(ventas, gastos),
    [ventas, gastos]
  );

  const resumen = useMemo(
    () => calcularResumenContable({ ventas, gastos, periodo }),
    [ventas, gastos, periodo]
  );

  const cerrarModalVenta = () => {
    setModalVentaAbierto(false);
    setVentaForm(crearEstadoInicialVenta(null));
    onCerrarModalInicial?.();
  };

  const handleSeleccionarProyecto = (firestoreId) => {
    const proyecto = proyectos.find((p) => p.firestoreId === firestoreId);
    const precioSugerido = proyecto ? redondearPrecioCliente(proyecto.precioVenta) : 0;
    setVentaForm((prev) => ({
      ...prev,
      proyectoSeleccionado: firestoreId,
      nombreCliente: prev.nombreCliente || proyecto?.clienteNombre || '',
      precioVentaManual: precioSugerido > 0 ? String(precioSugerido) : '',
    }));
  };

  const handleGuardarVenta = async (e) => {
    e.preventDefault();
    const proyecto = proyectos.find((p) => p.firestoreId === ventaForm.proyectoSeleccionado);

    const cantidad = parseInt(ventaForm.cantidad, 10) || 1;
    const precioManual = parseFloat(ventaForm.precioVentaManual);
    const precioUnitario =
      Number.isFinite(precioManual) && precioManual > 0
        ? precioManual
        : proyecto
          ? redondearPrecioCliente(proyecto.precioVenta)
          : 0;

    const precioTotal = precioUnitario * cantidad;
    const cajaPixelCraft = precioTotal * 0.30; // 30% para la caja del taller
    const socioA = precioTotal * 0.35;         // 35% Aldo Dante
    const socioB = precioTotal * 0.35;         // 35% Alejandro Ruiz

    const fechaISO = ventaForm.fechaISO || obtenerHoyISO();

    const nuevaVenta = {
      id: Date.now(),
      fechaISO,
      fecha: formatearFechaARDesdeISO(fechaISO),
      proyectoId: proyecto?.firestoreId || null,
      tipoProyecto: proyecto?.tipoProyecto || 'impresion_3d',
      productoNombre: proyecto ? proyecto.nombre : 'Venta Personalizada',
      impresoraNombre: proyecto?.impresoraNombre || '3D',
      cliente: ventaForm.nombreCliente || 'Cliente General',
      cantidad,
      precioUnitario,
      precioTotal,
      cajaPixelCraft,
      socioA,
      socioB,
      metodoPago: ventaForm.metodoPago,
      registradoPor: nombreEmisor,
    };

    try {
      await addDoc(collection(db, 'ventas'), nuevaVenta);
      cerrarModalVenta();
    } catch (err) {
      console.error('Error guardando venta:', err);
      alert('Error al registrar la venta.');
    }
  };

  const handleEliminarVenta = async (firestoreId) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro de venta?')) {
      try {
        await deleteDoc(doc(db, 'ventas', firestoreId));
      } catch (err) {
        console.error('Error al eliminar venta:', err);
        alert('Error al eliminar la venta.');
      }
    }
  };

  const handleEliminarGasto = async (firestoreId) => {
    if (window.confirm('¿Seguro que deseas eliminar este gasto del taller?')) {
      try {
        await deleteDoc(doc(db, 'gastos', firestoreId));
      } catch (err) {
        console.error('Error al eliminar gasto:', err);
        alert('Error al eliminar el gasto.');
      }
    }
  };

  const etiquetaPeriodo = formatearClaveMes(periodo);
  const cajaNegativa = resumen.saldoCajaPeriodo < 0;

  return (
    <div className="modulo-ventas">
      {/* BARRA DE FILTRO DE PERÍODO Y ACCIONES RÁPIDAS */}
      <div
        className="card mb-3 p-3 shadow-sm"
        style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="small fw-bold text-info" style={{ letterSpacing: '0.4px' }}>
              📅 PERÍODO:
            </span>
            <select
              className="form-select form-select-sm bg-dark text-white border-info fw-bold"
              style={{ width: 'auto', minWidth: '195px' }}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="todos">Todo el histórico</option>
              {mesesDisponibles.map((m) => (
                <option key={m.clave} value={m.clave}>
                  {m.label}
                </option>
              ))}
            </select>
            {periodo !== 'todos' && (
              <span
                className="badge py-2 px-3"
                style={{
                  backgroundColor: '#0b0e14',
                  border: `1px solid ${resumen.saldoCajaHistorico < 0 ? '#ff4444' : '#ffaa00'}`,
                  color: resumen.saldoCajaHistorico < 0 ? '#ff6b6b' : '#ffaa00',
                  fontSize: '0.75rem',
                }}
                title="Saldo real acumulado total de Caja PixelCraft contando todos los meses"
              >
                🏦 Saldo acumulado real en Caja: {formatoMoneda(resumen.saldoCajaHistorico)}
              </span>
            )}
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm fw-bold px-3 py-2"
              style={{
                backgroundColor: '#00d4ff',
                color: '#0b0e14',
                boxShadow: '0 0 10px rgba(0,212,255,0.35)',
              }}
              onClick={() => setModalVentaAbierto(true)}
            >
              + REGISTRAR VENTA
            </button>
            <button
              type="button"
              className="btn btn-sm fw-bold px-3 py-2"
              style={{
                backgroundColor: '#ffaa00',
                color: '#0b0e14',
                boxShadow: '0 0 10px rgba(255,170,0,0.3)',
              }}
              onClick={() => setModalGastoAbierto(true)}
            >
              − REGISTRAR GASTO
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN FINANCIERO DEL PERÍODO */}
      <div className="row g-3 mb-4">
        {/* 1. TOTAL FACTURADO */}
        <div className="col-lg-3 col-sm-6">
          <div
            className="card text-center p-3 h-100 shadow-sm"
            style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}
          >
            <span className="text-muted small fw-bold">TOTAL FACTURADO</span>
            <h4 className="fw-bold mt-2 text-white font-mono">
              {formatoMoneda(resumen.totalFacturado)}
            </h4>
            <span className="small text-muted">
              {resumen.ventasFiltradas.length} ventas · {etiquetaPeriodo}
            </span>
          </div>
        </div>

        {/* 2. CAJA PIXELCRAFT REAL (30% - GASTOS) */}
        <div className="col-lg-3 col-sm-6">
          <div
            className="card text-center p-3 h-100 shadow-sm"
            style={{
              backgroundColor: '#151921',
              border: `1px solid ${cajaNegativa ? '#ff4444' : '#ffaa00'}`,
            }}
          >
            <span
              className={`small fw-bold ${cajaNegativa ? 'text-danger' : 'text-warning'}`}
            >
              🏦 CAJA PIXELCRAFT {periodo === 'todos' ? 'REAL' : '(MES)'}
            </span>
            <h4
              className="fw-bold mt-2 font-mono"
              style={{ color: cajaNegativa ? '#ff6b6b' : '#ffaa00' }}
            >
              {formatoMoneda(resumen.saldoCajaPeriodo)}
            </h4>
            <div style={{ fontSize: '0.72rem', color: '#bbb' }}>
              <span className="text-success">+30%: {formatoMoneda(resumen.aporteCaja30)}</span>
              {' · '}
              <span className="text-danger">Gastos: -{formatoMoneda(resumen.totalGastos)}</span>
            </div>
          </div>
        </div>

        {/* 3. ALDO DANTE (35%) */}
        <div className="col-lg-3 col-sm-6">
          <div
            className="card text-center p-3 h-100 shadow-sm"
            style={{ backgroundColor: '#151921', border: '1px solid #00d4ff' }}
          >
            <span className="small fw-bold" style={{ color: '#00d4ff' }}>
              🤝 ALDO DANTE (35%)
            </span>
            <h4 className="fw-bold mt-2 font-mono" style={{ color: '#00d4ff' }}>
              {formatoMoneda(resumen.totalSocio1)}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
              35% intacto (gastos salen de Caja)
            </span>
          </div>
        </div>

        {/* 4. ALEJANDRO RUIZ (35%) */}
        <div className="col-lg-3 col-sm-6">
          <div
            className="card text-center p-3 h-100 shadow-sm"
            style={{ backgroundColor: '#151921', border: '1px solid #00d4ff' }}
          >
            <span className="small fw-bold" style={{ color: '#00d4ff' }}>
              🤝 ALEJANDRO RUIZ (35%)
            </span>
            <h4 className="fw-bold mt-2 font-mono" style={{ color: '#00d4ff' }}>
              {formatoMoneda(resumen.totalSocio2)}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
              35% intacto (gastos salen de Caja)
            </span>
          </div>
        </div>
      </div>

      {/* SUB-PESTAÑAS INTERNAS: VENTAS / GASTOS / BALANCE */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm fw-bold px-3 py-2"
          style={{
            backgroundColor: subTab === 'ventas' ? '#00d4ff' : '#151921',
            color: subTab === 'ventas' ? '#0b0e14' : '#e2e8f0',
            border: '1px solid #00d4ff',
          }}
          onClick={() => setSubTab('ventas')}
        >
          💰 VENTAS ({resumen.ventasFiltradas.length})
        </button>
        <button
          type="button"
          className="btn btn-sm fw-bold px-3 py-2"
          style={{
            backgroundColor: subTab === 'gastos' ? '#ffaa00' : '#151921',
            color: subTab === 'gastos' ? '#0b0e14' : '#ffaa00',
            border: '1px solid #ffaa00',
          }}
          onClick={() => setSubTab('gastos')}
        >
          🧾 GASTOS DEL TALLER ({resumen.gastosFiltrados.length})
        </button>
        <button
          type="button"
          className="btn btn-sm fw-bold px-3 py-2"
          style={{
            backgroundColor: subTab === 'balance' ? '#00ff88' : '#151921',
            color: subTab === 'balance' ? '#0b0e14' : '#00ff88',
            border: '1px solid #00ff88',
          }}
          onClick={() => setSubTab('balance')}
        >
          📊 BALANCE MENSUAL Y CATEGORÍAS
        </button>
      </div>

      {/* SUB-VISTA 1: TABLA DE VENTAS */}
      {subTab === 'ventas' && (
        <div
          className="card shadow"
          style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}
        >
          <div
            className="card-header d-flex justify-content-between align-items-center py-3"
            style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #00d4ff' }}
          >
            <span className="fw-bold text-white" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
              REGISTRO DE VENTAS — {etiquetaPeriodo.toUpperCase()} ({resumen.ventasFiltradas.length})
            </span>
          </div>

          <div className="card-body p-0 table-responsive">
            {resumen.ventasFiltradas.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted small mb-3">
                  No hay ventas registradas para {etiquetaPeriodo.toLowerCase()}.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  onClick={() => setModalVentaAbierto(true)}
                >
                  Registrar una venta
                </button>
              </div>
            ) : (
              <table
                className="table table-dark table-hover align-middle mb-0"
                style={{ backgroundColor: 'transparent' }}
              >
                <thead>
                  <tr className="small text-muted" style={{ borderBottom: '1px solid #2a2f3a' }}>
                    <th className="ps-3">Fecha</th>
                    <th>Producto</th>
                    <th>Cliente</th>
                    <th>Medio</th>
                    <th>Total Cobrado</th>
                    <th style={{ color: '#ffaa00' }}>Caja (30%)</th>
                    <th style={{ color: '#00d4ff' }}>Aldo (35%)</th>
                    <th style={{ color: '#00d4ff' }}>Alejandro (35%)</th>
                    <th className="text-end pe-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {resumen.ventasFiltradas.map((v) => {
                    const cobrado = parseFloat(v.precioTotal) || 0;
                    const caja = obtenerAporteCajaVenta(v);
                    const s1 = obtenerSocio1Venta(v);
                    const s2 = obtenerSocio2Venta(v);

                    return (
                      <tr key={v.firestoreId} style={{ borderBottom: '1px solid #1a202c' }}>
                        <td className="ps-3 text-muted">{v.fecha}</td>
                        <td>
                          <span className="fw-bold text-white">{v.productoNombre}</span>{' '}
                          <span className="badge bg-secondary ms-1">x{v.cantidad}</span>
                        </td>
                        <td className="text-muted">{v.cliente}</td>
                        <td>
                          <span className="badge border border-secondary text-light">
                            {v.metodoPago || 'General'}
                          </span>
                        </td>
                        <td className="text-white fw-bold">{formatoMoneda(cobrado)}</td>
                        <td className="text-warning fw-semibold">{formatoMoneda(caja)}</td>
                        <td style={{ color: '#00d4ff' }}>{formatoMoneda(s1)}</td>
                        <td style={{ color: '#00d4ff' }}>{formatoMoneda(s2)}</td>
                        <td className="text-end pe-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-2 border-0"
                            onClick={() => handleEliminarVenta(v.firestoreId)}
                            title="Eliminar venta"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: TABLA DE GASTOS DEL TALLER */}
      {subTab === 'gastos' && (
        <div
          className="card shadow"
          style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}
        >
          <div
            className="card-header d-flex justify-content-between align-items-center py-3"
            style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #ffaa00' }}
          >
            <span className="fw-bold text-warning" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
              GASTOS Y COMPRAS DEL TALLER — {etiquetaPeriodo.toUpperCase()} ({resumen.gastosFiltrados.length})
            </span>
            <span className="small fw-bold text-danger font-mono">
              Total egresos: -{formatoMoneda(resumen.totalGastos)}
            </span>
          </div>

          <div className="card-body p-0 table-responsive">
            {resumen.gastosFiltrados.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted small mb-3">
                  No hay gastos cargados para {etiquetaPeriodo.toLowerCase()}.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={() => setModalGastoAbierto(true)}
                >
                  Registrar primer gasto del taller
                </button>
              </div>
            ) : (
              <table
                className="table table-dark table-hover align-middle mb-0"
                style={{ backgroundColor: 'transparent' }}
              >
                <thead>
                  <tr className="small text-muted" style={{ borderBottom: '1px solid #2a2f3a' }}>
                    <th className="ps-3">Fecha</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Proveedor</th>
                    <th>Medio</th>
                    <th>Cargado por</th>
                    <th className="text-danger">Monto</th>
                    <th className="text-end pe-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {resumen.gastosFiltrados.map((g) => {
                    const metaCat =
                      CATEGORIAS_GASTO.find((c) => c.id === g.categoria) ||
                      CATEGORIAS_GASTO[CATEGORIAS_GASTO.length - 1];

                    return (
                      <tr key={g.firestoreId} style={{ borderBottom: '1px solid #1a202c' }}>
                        <td className="ps-3 text-muted">{g.fecha}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: metaCat.color,
                              border: `1px solid ${metaCat.color}`,
                            }}
                          >
                            {metaCat.icono} {g.categoria}
                          </span>
                        </td>
                        <td className="fw-bold text-white">{g.descripcion}</td>
                        <td className="text-muted">{g.proveedor || '—'}</td>
                        <td>
                          <span className="badge border border-secondary text-light">
                            {g.metodoPago || 'General'}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {g.registradoPor || '—'}
                        </td>
                        <td className="text-danger fw-bold font-mono">
                          − {formatoMoneda(g.monto)}
                        </td>
                        <td className="text-end pe-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-2 border-0"
                            onClick={() => handleEliminarGasto(g.firestoreId)}
                            title="Eliminar gasto"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-VISTA 3: BALANCE MENSUAL Y GASTOS POR CATEGORÍA */}
      {subTab === 'balance' && (
        <div className="row g-3">
          {/* EVOLUCIÓN MENSUAL */}
          <div className="col-lg-8">
            <div
              className="card shadow h-100"
              style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}
            >
              <div
                className="card-header py-3 d-flex justify-content-between align-items-center"
                style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #00ff88' }}
              >
                <span className="fw-bold" style={{ color: '#00ff88', fontSize: '0.85rem' }}>
                  📅 EVOLUCIÓN MENSUAL (INGRESOS VS GASTOS)
                </span>
                <span className="small text-muted">Clic en un mes para filtrar</span>
              </div>

              <div className="card-body p-0 table-responsive">
                {resumen.resumenMensual.length === 0 ? (
                  <p className="text-center text-muted small py-5 mb-0">
                    Todavía no hay ventas ni gastos registrados.
                  </p>
                ) : (
                  <table
                    className="table table-dark table-hover align-middle mb-0"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <thead>
                      <tr className="small text-muted" style={{ borderBottom: '1px solid #2a2f3a' }}>
                        <th className="ps-3">Mes</th>
                        <th>Facturado</th>
                        <th className="text-warning">Caja +30%</th>
                        <th className="text-danger">Gastos</th>
                        <th>Flujo Caja Mes</th>
                        <th style={{ color: '#00d4ff' }} className="pe-3">c/Socio (35%)</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {resumen.resumenMensual.map((m) => {
                        const seleccionado = periodo === m.clave;
                        return (
                          <tr
                            key={m.clave}
                            onClick={() => setPeriodo(seleccionado ? 'todos' : m.clave)}
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px solid #1a202c',
                              backgroundColor: seleccionado ? 'rgba(0,212,255,0.1)' : 'transparent',
                            }}
                          >
                            <td className="ps-3 fw-bold text-white">
                              {m.label}
                              {seleccionado && (
                                <span className="badge bg-info text-dark ms-2">Activo</span>
                              )}
                            </td>
                            <td className="fw-bold text-white font-mono">
                              {formatoMoneda(m.ingresos)}
                              <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                {m.cantidadVentas} vtas
                              </div>
                            </td>
                            <td className="text-warning font-mono">
                              +{formatoMoneda(m.aporteCaja30)}
                            </td>
                            <td className="text-danger font-mono">
                              −{formatoMoneda(m.gastos)}
                              <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                {m.cantidadGastos} gastos
                              </div>
                            </td>
                            <td
                              className="fw-bold font-mono"
                              style={{ color: m.saldoCajaMes < 0 ? '#ff6b6b' : '#00ff88' }}
                            >
                              {m.saldoCajaMes >= 0 ? '+' : ''}
                              {formatoMoneda(m.saldoCajaMes)}
                            </td>
                            <td className="pe-3 font-mono" style={{ color: '#00d4ff' }}>
                              {formatoMoneda(m.socio1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* DESGLOSE DE GASTOS POR CATEGORÍA */}
          <div className="col-lg-4">
            <div
              className="card shadow h-100"
              style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}
            >
              <div
                className="card-header py-3"
                style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #ffaa00' }}
              >
                <span className="fw-bold text-warning" style={{ fontSize: '0.85rem' }}>
                  🧾 GASTOS POR CATEGORÍA ({etiquetaPeriodo})
                </span>
              </div>
              <div className="card-body p-3">
                {resumen.gastosPorCategoria.length === 0 ? (
                  <p className="text-center text-muted small py-4 mb-0">
                    Sin gastos en este período.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {resumen.gastosPorCategoria.map((item) => (
                      <div key={item.categoria}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="text-white fw-semibold">
                            {item.icono} {item.categoria}
                          </span>
                          <span className="font-mono text-warning fw-bold">
                            {formatoMoneda(item.monto)}{' '}
                            <span className="text-muted">({item.porcentaje.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div
                          className="progress"
                          style={{ height: '7px', backgroundColor: '#0b0e14' }}
                        >
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${Math.min(100, item.porcentaje)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <hr className="my-1 border-secondary" />
                    <div className="d-flex justify-content-between small fw-bold">
                      <span className="text-muted">TOTAL GASTOS:</span>
                      <span className="text-danger font-mono">
                        {formatoMoneda(resumen.totalGastos)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR VENTA */}
      {modalVentaAbierto && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content text-white"
              style={{ backgroundColor: '#151921', border: '1px solid #00d4ff' }}
            >
              <div
                className="modal-header"
                style={{ borderBottom: '1px solid #2a2f3a', backgroundColor: '#0b0e14' }}
              >
                <h6
                  className="modal-title fw-bold"
                  style={{ color: '#00d4ff', fontSize: '0.85rem', letterSpacing: '0.5px' }}
                >
                  REGISTRAR NUEVA VENTA
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={cerrarModalVenta}
                ></button>
              </div>

              <form onSubmit={handleGuardarVenta}>
                <div className="modal-body p-4">
                  <div className="row g-2 mb-3">
                    <div className="col-5">
                      <label className="small text-white mb-1 fw-bold">Fecha</label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={ventaForm.fechaISO}
                        onChange={(e) =>
                          setVentaForm({ ...ventaForm, fechaISO: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-7">
                      <label className="small text-white mb-1 fw-bold">Método de Cobro</label>
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        value={ventaForm.metodoPago}
                        onChange={(e) =>
                          setVentaForm({ ...ventaForm, metodoPago: e.target.value })
                        }
                      >
                        <option value="Transferencia">Transferencia bancaria / Alias</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Mercado Pago">Mercado Pago</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="small text-white mb-1 fw-bold">
                      Pieza o Proyecto Calculado
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={ventaForm.proyectoSeleccionado}
                      onChange={(e) => handleSeleccionarProyecto(e.target.value)}
                      required
                    >
                      <option value="">-- Seleccionar de los proyectos guardados --</option>
                      {proyectos.map((p) => (
                        <option key={p.firestoreId} value={p.firestoreId}>
                          {p.nombre} (Cobro sugerido:{' '}
                          {formatoMoneda(redondearPrecioCliente(p.precioVenta))})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="small text-white mb-1">Cliente / Destinatario</label>
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        placeholder="Ej: Marcelo Gómez"
                        value={ventaForm.nombreCliente}
                        onChange={(e) =>
                          setVentaForm({ ...ventaForm, nombreCliente: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-2">
                      <label className="small text-white mb-1">Cant.</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control bg-dark text-white border-secondary"
                        value={ventaForm.cantidad}
                        onChange={(e) =>
                          setVentaForm({ ...ventaForm, cantidad: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-4">
                      <label className="small text-white mb-1">Precio un. ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-control bg-dark text-info border-secondary fw-bold"
                        placeholder="Cobrado"
                        value={ventaForm.precioVentaManual}
                        onChange={(e) =>
                          setVentaForm({ ...ventaForm, precioVentaManual: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* PREVIEW DEL REPARTO 30% / 35% / 35% */}
                  {ventaForm.proyectoSeleccionado &&
                    (() => {
                      const sel = proyectos.find(
                        (p) => p.firestoreId === ventaForm.proyectoSeleccionado
                      );
                      if (!sel) return null;
                      const precioUnitarioPreview =
                        Number(ventaForm.precioVentaManual) > 0
                          ? Number(ventaForm.precioVentaManual)
                          : redondearPrecioCliente(sel.precioVenta);
                      const totalVenta =
                        precioUnitarioPreview * (parseInt(ventaForm.cantidad, 10) || 1);
                      return (
                        <div
                          className="p-2 rounded mt-2"
                          style={{
                            backgroundColor: '#0b0e14',
                            border: '1px solid #2a2f3a',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div className="d-flex justify-content-between mb-1">
                            <span className="text-muted">Total a Cobrar:</span>
                            <span className="fw-bold text-white">{formatoMoneda(totalVenta)}</span>
                          </div>
                          <div className="d-flex justify-content-between text-warning mb-1">
                            <span>🏦 Caja PixelCraft (30%):</span>
                            <span className="fw-bold">{formatoMoneda(totalVenta * 0.30)}</span>
                          </div>
                          <div className="d-flex justify-content-between" style={{ color: '#00d4ff' }}>
                            <span>🤝 Aldo &amp; Alejandro (35% c/u):</span>
                            <span className="fw-bold">{formatoMoneda(totalVenta * 0.35)}</span>
                          </div>
                        </div>
                      );
                    })()}
                </div>

                <div
                  className="modal-footer"
                  style={{ borderTop: '1px solid #2a2f3a', backgroundColor: '#0b0e14' }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={cerrarModalVenta}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm fw-bold px-3"
                    style={{ backgroundColor: '#00d4ff', color: '#0b0e14' }}
                  >
                    CONFIRMAR VENTA
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR GASTO DEL TALLER */}
      {modalGastoAbierto && (
        <ModalGasto
          saldoCajaHistorico={resumen.saldoCajaHistorico}
          nombreEmisor={nombreEmisor}
          onClose={() => setModalGastoAbierto(false)}
        />
      )}
    </div>
  );
}

export default ModuloVentas;
