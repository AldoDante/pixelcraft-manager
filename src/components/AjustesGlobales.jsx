import React, { useState } from 'react';
import { PERFILES_IMPRESORAS } from '../utils/calculos';

function AjustesGlobales({ config, setConfig, guardarAjustesGlobales }) {
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState("kobra-combo");

  const impresoraActual = config.impresoras?.[impresoraSeleccionada] || PERFILES_IMPRESORAS[impresoraSeleccionada];

  const actualizarImpresora = (campo, valor) => {
    setConfig(prev => ({
      ...prev,
      impresoras: {
        ...(prev.impresoras || {}),
        [impresoraSeleccionada]: {
          ...(prev.impresoras?.[impresoraSeleccionada] || PERFILES_IMPRESORAS[impresoraSeleccionada]),
          [campo]: valor
        }
      }
    }));
  };

  return (
    <div className="card shadow-sm border-warning h-100" style={{ backgroundColor: '#151921' }}>
      <div className="card-header bg-warning text-dark fw-bold small text-center d-flex justify-content-between align-items-center">
        <span>⚙️ AJUSTES GLOBALES</span>
        <span className="badge bg-dark text-warning">NUBE</span>
      </div>
      <div className="card-body p-2 d-flex flex-column gap-2">
        {/* TARIFA ELÉCTRICA */}
        <div>
          <label className="small fw-bold text-white d-flex justify-content-between">
            <span>Tarifa Luz (EJESA)</span>
            <span className="text-warning">$/kWh</span>
          </label>
          <input 
            type="number" 
            step="1" 
            className="form-control form-control-sm bg-dark text-warning border-secondary fw-bold" 
            value={config.kwh ?? 425} 
            onChange={e => setConfig({ ...config, kwh: e.target.value })} 
          />
          <small className="text-muted" style={{ fontSize: '0.65rem' }}>Boleta real: $425/kWh</small>
        </div>

        {/* MARGEN POR DEFECTO */}
        <div>
          <label className="small fw-bold text-white d-flex justify-content-between">
            <span>Margen Base</span>
            <span className="text-info">%</span>
          </label>
          <input 
            type="number" 
            className="form-control form-control-sm bg-dark text-info border-secondary fw-bold" 
            value={config.margen ?? 100} 
            onChange={e => setConfig({ ...config, margen: e.target.value })} 
          />
        </div>

        <hr className="my-1 border-secondary" />

        {/* PARÁMETROS POR IMPRESORA */}
        <div>
          <label className="small fw-bold text-white mb-1">Valores por Máquina</label>
          <select 
            className="form-select form-select-sm bg-dark text-info border-secondary mb-2"
            value={impresoraSeleccionada}
            onChange={e => setImpresoraSeleccionada(e.target.value)}
          >
            <option value="kobra-combo">Anycubic Kobra Combo</option>
            <option value="bambu-a1">Bambu Lab A1 (Stand-alone)</option>
            <option value="snapmaker-u1">Snapmaker U1 (Multiherramienta)</option>
          </select>

          <div className="mb-2">
            <label className="text-muted" style={{ fontSize: '0.7rem' }}>Valor Reposición Máquina ($)</label>
            <input 
              type="number" 
              className="form-control form-control-sm bg-dark text-white border-secondary"
              value={impresoraActual?.valorMaquina ?? 1100000}
              onChange={e => actualizarImpresora('valorMaquina', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="mb-2">
            <label className="text-muted" style={{ fontSize: '0.7rem' }}>Horas Vida Útil (Fabricante)</label>
            <input 
              type="number" 
              className="form-control form-control-sm bg-dark text-white border-secondary"
              value={impresoraActual?.vidaUtilHoras ?? 3000}
              onChange={e => actualizarImpresora('vidaUtilHoras', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="mb-2">
            <label className="text-muted" style={{ fontSize: '0.7rem' }}>Kit Service cada 500h ($)</label>
            <input 
              type="number" 
              className="form-control form-control-sm bg-dark text-white border-secondary"
              value={impresoraActual?.costoService500h ?? 25000}
              onChange={e => actualizarImpresora('costoService500h', parseFloat(e.target.value) || 0)}
            />
            <small className="text-muted" style={{ fontSize: '0.65rem' }}>
              ${((impresoraActual?.costoService500h || 25000) / 500).toFixed(1)}/h de desgaste
            </small>
          </div>
        </div>

        <button 
          onClick={guardarAjustesGlobales} 
          className="btn btn-sm w-100 fw-bold mt-auto" 
          style={{ backgroundColor: '#00d4ff', color: '#0b0e14' }}
        >
          💾 GUARDAR AJUSTES
        </button>
      </div>
    </div>
  );
}

export default AjustesGlobales;
