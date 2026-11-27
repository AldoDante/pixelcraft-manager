import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  CATEGORIAS_GASTO,
  obtenerHoyISO,
  formatearFechaARDesdeISO,
} from '../utils/contabilidad';

function ModalGasto({ saldoCajaHistorico, nombreEmisor, onClose }) {
  const [gastoForm, setGastoForm] = useState({
    fechaISO: obtenerHoyISO(),
    categoria: CATEGORIAS_GASTO[0].id,
    descripcion: '',
    proveedor: '',
    monto: '',
    metodoPago: 'Transferencia',
  });
  const [guardando, setGuardando] = useState(false);

  const formatoMoneda = (val) =>
    (val || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const montoNumerico = parseFloat(gastoForm.monto) || 0;
  const saldoResultante = saldoCajaHistorico - montoNumerico;

  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!gastoForm.descripcion.trim() || montoNumerico <= 0) {
      alert('Completá la descripción y un monto mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      const nuevoGasto = {
        id: Date.now(),
        fechaISO: gastoForm.fechaISO || obtenerHoyISO(),
        fecha: formatearFechaARDesdeISO(gastoForm.fechaISO),
        categoria: gastoForm.categoria,
        descripcion: gastoForm.descripcion.trim(),
        proveedor: gastoForm.proveedor.trim(),
        monto: montoNumerico,
        metodoPago: gastoForm.metodoPago,
        registradoPor: nombreEmisor || 'PixelCraft 3D',
      };

      await addDoc(collection(db, 'gastos'), nuevoGasto);
      onClose();
    } catch (err) {
      console.error('Error guardando gasto:', err);
      alert('Error al registrar el gasto. Verificá que las reglas de Firestore incluyan la colección "gastos".');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content text-white"
          style={{ backgroundColor: '#151921', border: '1px solid #ffaa00' }}
        >
          <div
            className="modal-header"
            style={{ borderBottom: '1px solid #2a2f3a', backgroundColor: '#0b0e14' }}
          >
            <h6
              className="modal-title fw-bold text-warning"
              style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}
            >
              🧾 REGISTRAR GASTO DEL TALLER (CAJA PIXELCRAFT)
            </h6>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          <form onSubmit={handleGuardarGasto}>
            <div className="modal-body p-4">
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="small text-white mb-1 fw-bold">Fecha</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={gastoForm.fechaISO}
                    onChange={(e) =>
                      setGastoForm({ ...gastoForm, fechaISO: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="small text-white mb-1 fw-bold">Categoría</label>
                  <select
                    className="form-select bg-dark text-warning border-secondary"
                    value={gastoForm.categoria}
                    onChange={(e) =>
                      setGastoForm({ ...gastoForm, categoria: e.target.value })
                    }
                  >
                    {CATEGORIAS_GASTO.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icono} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="small text-white mb-1 fw-bold">Descripción</label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="Ej: 2kg PLA+ Negro Grilon3 / Boleta EJESA / Tira LED 12V"
                  value={gastoForm.descripcion}
                  onChange={(e) =>
                    setGastoForm({ ...gastoForm, descripcion: e.target.value })
                  }
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="small text-white mb-1">Proveedor / Comercio (opcional)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Ej: Mercado Libre, EJESA..."
                    value={gastoForm.proveedor}
                    onChange={(e) =>
                      setGastoForm({ ...gastoForm, proveedor: e.target.value })
                    }
                  />
                </div>
                <div className="col-6">
                  <label className="small text-white mb-1 fw-bold">Monto ($ ARS)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-control bg-dark text-warning border-secondary fw-bold"
                    placeholder="Ej: 24500"
                    value={gastoForm.monto}
                    onChange={(e) =>
                      setGastoForm({ ...gastoForm, monto: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="small text-white mb-1">Medio de Pago</label>
                <select
                  className="form-select bg-dark text-white border-secondary"
                  value={gastoForm.metodoPago}
                  onChange={(e) =>
                    setGastoForm({ ...gastoForm, metodoPago: e.target.value })
                  }
                >
                  <option value="Transferencia">Transferencia bancaria / Alias</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Tarjeta">Tarjeta de débito / crédito</option>
                </select>
              </div>

              {/* PREVIEW DEL IMPACTO EN CAJA PIXELCRAFT */}
              <div
                className="p-2 rounded mt-2"
                style={{
                  backgroundColor: '#0b0e14',
                  border: `1px solid ${saldoResultante < 0 ? '#ff4444' : '#2a2f3a'}`,
                  fontSize: '0.78rem',
                }}
              >
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">🏦 Caja PixelCraft actual:</span>
                  <span className="fw-bold text-warning">
                    {formatoMoneda(saldoCajaHistorico)}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Este gasto:</span>
                  <span className="fw-bold text-danger">
                    - {formatoMoneda(montoNumerico)}
                  </span>
                </div>
                <hr className="my-1 border-secondary" />
                <div className="d-flex justify-content-between">
                  <span className="text-light fw-bold">Saldo proyectado en Caja:</span>
                  <span
                    className="fw-bold"
                    style={{ color: saldoResultante < 0 ? '#ff4444' : '#00ff88' }}
                  >
                    {formatoMoneda(saldoResultante)}
                  </span>
                </div>
                {saldoResultante < 0 && (
                  <div className="text-danger mt-1" style={{ fontSize: '0.7rem' }}>
                    ⚠️ El gasto supera el saldo acumulado actual de la Caja (quedará en negativo hasta futuras ventas).
                  </div>
                )}
              </div>
            </div>

            <div
              className="modal-footer"
              style={{ borderTop: '1px solid #2a2f3a', backgroundColor: '#0b0e14' }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="btn btn-sm fw-bold px-3"
                style={{ backgroundColor: '#ffaa00', color: '#0b0e14' }}
              >
                {guardando ? 'GUARDANDO...' : 'CONFIRMAR GASTO'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ModalGasto;
