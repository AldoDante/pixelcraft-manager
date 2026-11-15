import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';

function ModuloVentas({ ventas, proyectos }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ventaForm, setVentaForm] = useState({
    proyectoSeleccionado: '',
    nombreCliente: '',
    cantidad: 1,
    precioVentaManual: '',
    metodoPago: 'Transferencia'
  });

  const formatoMoneda = (val) => (val || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  // Cálculos acumulados globales según la regla: 30% Caja PixelCraft, 35% Socio 1, 35% Socio 2
  const totalFacturado = ventas.reduce((acc, v) => acc + (parseFloat(v.precioTotal) || 0), 0);
  const totalCajaPixelCraft = totalFacturado * 0.30;
  const totalSocio1 = totalFacturado * 0.35;
  const totalSocio2 = totalFacturado * 0.35;

  // Registrar venta
  const handleGuardarVenta = async (e) => {
    e.preventDefault();
    const proyecto = proyectos.find(p => p.firestoreId === ventaForm.proyectoSeleccionado);

    const cantidad = parseInt(ventaForm.cantidad) || 1;
    const precioUnitario = proyecto ? proyecto.precioVenta : (parseFloat(ventaForm.precioVentaManual) || 0);

    const precioTotal = precioUnitario * cantidad;
    const cajaPixelCraft = precioTotal * 0.30; // 30% para la caja del taller
    const socioA = precioTotal * 0.35;         // 35% para el socio 1
    const socioB = precioTotal * 0.35;         // 35% para el socio 2

    const nuevaVenta = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString('es-AR'),
      productoNombre: proyecto ? proyecto.nombre : "Venta Personalizada",
      impresoraNombre: proyecto?.impresoraNombre || "3D",
      cliente: ventaForm.nombreCliente || "Cliente General",
      cantidad,
      precioTotal,
      cajaPixelCraft,
      socioA,
      socioB,
      metodoPago: ventaForm.metodoPago
    };

    try {
      await addDoc(collection(db, "ventas"), nuevaVenta);
      setModalAbierto(false);
      setVentaForm({
        proyectoSeleccionado: '',
        nombreCliente: '',
        cantidad: 1,
        precioVentaManual: '',
        metodoPago: 'Transferencia'
      });
    } catch (err) {
      console.error("Error guardando venta:", err);
      alert("Error al registrar la venta.");
    }
  };

  const handleEliminarVenta = async (firestoreId) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro de venta?")) {
      try {
        await deleteDoc(doc(db, "ventas", firestoreId));
      } catch (err) {
        console.error("Error al eliminar venta:", err);
        alert("Error al eliminar el registro.");
      }
    }
  };

  return (
    <div className="modulo-ventas">
      {/* TARJETAS RESUMEN FINANCIERO */}
      <div className="row g-3 mb-4">
        {/* TOTAL FACTURADO */}
        <div className="col-lg-3 col-sm-6">
          <div className="card text-center p-3 h-100 shadow-sm" style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}>
            <span className="text-muted small fw-bold">TOTAL FACTURADO</span>
            <h4 className="fw-bold mt-2 text-white font-mono">{formatoMoneda(totalFacturado)}</h4>
            <span className="small text-muted">{ventas.length} ventas realizadas</span>
          </div>
        </div>

        {/* CAJA PIXELCRAFT (30%) */}
        <div className="col-lg-3 col-sm-6">
          <div className="card text-center p-3 h-100 shadow-sm" style={{ backgroundColor: '#151921', border: '1px solid #ffaa00' }}>
            <span className="text-warning small fw-bold">🏦 CAJA PIXELCRAFT (30%)</span>
            <h4 className="fw-bold mt-2 text-warning font-mono">{formatoMoneda(totalCajaPixelCraft)}</h4>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Fondo para filamentos, repuestos e insumos</span>
          </div>
        </div>

        {/* SOCIO 1 (35%) */}
        <div className="col-lg-3 col-sm-6">
          <div className="card text-center p-3 h-100 shadow-sm" style={{ backgroundColor: '#151921', border: '1px solid #00d4ff' }}>
            <span className="small fw-bold" style={{ color: '#00d4ff' }}>🤝 SOCIO 1 (35%)</span>
            <h4 className="fw-bold mt-2 font-mono" style={{ color: '#00d4ff' }}>{formatoMoneda(totalSocio1)}</h4>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Retiro disponible (35% de ventas)</span>
          </div>
        </div>

        {/* SOCIO 2 (35%) */}
        <div className="col-lg-3 col-sm-6">
          <div className="card text-center p-3 h-100 shadow-sm" style={{ backgroundColor: '#151921', border: '1px solid #00d4ff' }}>
            <span className="small fw-bold" style={{ color: '#00d4ff' }}>🤝 SOCIO 2 (35%)</span>
            <h4 className="fw-bold mt-2 font-mono" style={{ color: '#00d4ff' }}>{formatoMoneda(totalSocio2)}</h4>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Retiro disponible (35% de ventas)</span>
          </div>
        </div>
      </div>

      {/* BOTÓN Y TABLA DE HISTORIAL DE VENTAS */}
      <div className="card shadow" style={{ backgroundColor: '#151921', border: '1px solid #2a2f3a' }}>
        <div className="card-header d-flex justify-content-between align-items-center py-3" style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #00d4ff' }}>
          <span className="fw-bold text-white" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
            REGISTRO DE VENTAS ({ventas.length})
          </span>
          <button
            className="btn btn-sm fw-bold px-3 py-2"
            style={{ backgroundColor: '#00d4ff', color: '#0b0e14', boxShadow: '0 0 10px rgba(0,212,255,0.4)' }}
            onClick={() => setModalAbierto(true)}
          >
            + REGISTRAR VENTA
          </button>
        </div>

        <div className="card-body p-0 table-responsive">
          {ventas.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted small mb-3">No hay ventas registradas en la base de datos.</p>
              <button
                className="btn btn-sm btn-outline-info"
                onClick={() => setModalAbierto(true)}
              >
                Registrar la primera venta
              </button>
            </div>
          ) : (
            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
              <thead>
                <tr className="small text-muted" style={{ borderBottom: '1px solid #2a2f3a' }}>
                  <th className="ps-3">Fecha</th>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Medio</th>
                  <th>Total Cobrado</th>
                  <th style={{ color: '#ffaa00' }}>Caja PixelCraft (30%)</th>
                  <th style={{ color: '#00d4ff' }}>Socio 1 (35%)</th>
                  <th style={{ color: '#00d4ff' }}>Socio 2 (35%)</th>
                  <th className="text-end pe-3">Acción</th>
                </tr>
              </thead>
              <tbody className="small">
                {ventas.map((v) => {
                  const cobrado = parseFloat(v.precioTotal) || 0;
                  const caja = v.cajaPixelCraft !== undefined ? v.cajaPixelCraft : (cobrado * 0.30);
                  const s1 = v.socioA !== undefined ? v.socioA : (cobrado * 0.35);
                  const s2 = v.socioB !== undefined ? v.socioB : (cobrado * 0.35);

                  return (
                    <tr key={v.firestoreId} style={{ borderBottom: '1px solid #1a202c' }}>
                      <td className="ps-3 text-muted">{v.fecha}</td>
                      <td>
                        <span className="fw-bold text-white">{v.productoNombre}</span>{' '}
                        <span className="badge bg-secondary ms-1">x{v.cantidad}</span>
                      </td>
                      <td className="text-muted">{v.cliente}</td>
                      <td><span className="badge border border-secondary text-light">{v.metodoPago || 'General'}</span></td>
                      <td className="text-white fw-bold">{formatoMoneda(cobrado)}</td>
                      <td className="text-warning fw-semibold">{formatoMoneda(caja)}</td>
                      <td style={{ color: '#00d4ff' }}>{formatoMoneda(s1)}</td>
                      <td style={{ color: '#00d4ff' }}>{formatoMoneda(s2)}</td>
                      <td className="text-end pe-3">
                        <button
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

      {/* MODAL REGISTRAR VENTA */}
      {modalAbierto && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-white" style={{ backgroundColor: '#151921', border: '1px solid #00d4ff' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #2a2f3a', backgroundColor: '#0b0e14' }}>
                <h6 className="modal-title fw-bold" style={{ color: '#00d4ff', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                  REGISTRAR NUEVA VENTA
                </h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalAbierto(false)}></button>
              </div>

              <form onSubmit={handleGuardarVenta}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="small text-white mb-1 fw-bold">Pieza o Proyecto Calculado</label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={ventaForm.proyectoSeleccionado}
                      onChange={(e) => setVentaForm({ ...ventaForm, proyectoSeleccionado: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccionar de los proyectos guardados --</option>
                      {proyectos.map((p) => (
                        <option key={p.firestoreId} value={p.firestoreId}>
                          {p.nombre} (Cobro: {formatoMoneda(p.precioVenta)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-8">
                      <label className="small text-white mb-1">Cliente / Destinatario</label>
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        placeholder="Ej: Marcelo Gómez"
                        value={ventaForm.nombreCliente}
                        onChange={(e) => setVentaForm({ ...ventaForm, nombreCliente: e.target.value })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="small text-white mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control bg-dark text-white border-secondary"
                        value={ventaForm.cantidad}
                        onChange={(e) => setVentaForm({ ...ventaForm, cantidad: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="small text-white mb-1">Método de Cobro</label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={ventaForm.metodoPago}
                      onChange={(e) => setVentaForm({ ...ventaForm, metodoPago: e.target.value })}
                    >
                      <option value="Transferencia">Transferencia bancaria / Alias</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                    </select>
                  </div>

                  {/* PREVIEW DEL REPARTO 30% / 35% / 35% */}
                  {ventaForm.proyectoSeleccionado && (() => {
                    const sel = proyectos.find(p => p.firestoreId === ventaForm.proyectoSeleccionado);
                    if (!sel) return null;
                    const totalVenta = (sel.precioVenta || 0) * (parseInt(ventaForm.cantidad) || 1);
                    return (
                      <div className="p-2 rounded mt-2" style={{ backgroundColor: '#0b0e14', border: '1px solid #2a2f3a', fontSize: '0.75rem' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Total a Cobrar:</span>
                          <span className="fw-bold text-white">{formatoMoneda(totalVenta)}</span>
                        </div>
                        <div className="d-flex justify-content-between text-warning mb-1">
                          <span>🏦 Caja PixelCraft (30%):</span>
                          <span className="fw-bold">{formatoMoneda(totalVenta * 0.30)}</span>
                        </div>
                        <div className="d-flex justify-content-between" style={{ color: '#00d4ff' }}>
                          <span>🤝 Cada Socio (35% c/u):</span>
                          <span className="fw-bold">{formatoMoneda(totalVenta * 0.35)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid #2a2f3a', backgroundColor: '#0b0e14' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalAbierto(false)}>
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
    </div>
  );
}

export default ModuloVentas;
