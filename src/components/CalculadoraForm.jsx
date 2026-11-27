import React from 'react';
import { PERFILES_IMPRESORAS } from '../utils/calculos';

const OPCIONES_MEDIOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'tarjeta-mp', label: 'Tarjeta de crédito (MP)' },
];

function CalculadoraForm({
  form,
  setForm,
  handleCalcular,
  editandoId,
  calculoFinalizado,
  iniciarNuevoCalculo,
  cancelarEdicion,
  ultimoResultado
}) {
  const formatoMoneda = (val) => (val || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const impresoraActual = PERFILES_IMPRESORAS[form.impresoraId || 'kobra-combo'];
  const mediosSeleccionados = Array.isArray(form.mediosPago) ? form.mediosPago : [];

  const toggleMedioPago = (label) => {
    const existe = mediosSeleccionados.includes(label);
    const actualizados = existe
      ? mediosSeleccionados.filter((m) => m !== label)
      : [...mediosSeleccionados, label];
    setForm({ ...form, mediosPago: actualizados });
  };

  return (
    <div className="d-flex flex-column gap-3">
      <div 
        className={`card shadow ${editandoId ? 'border-warning' : 'border-info'}`} 
        style={{ backgroundColor: '#151921', borderWidth: '2px' }}
      >
        <div 
          className="card-header text-white fw-bold d-flex align-items-center justify-content-between" 
          style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #2a2f3a' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span>🖨️</span>
            <span>{calculoFinalizado ? 'PROYECTO GUARDADO' : editandoId ? 'EDITANDO PROYECTO' : 'NUEVA COTIZACIÓN'}</span>
          </div>
          <span className="badge border border-info text-info" style={{ fontSize: '0.7rem' }}>
            {impresoraActual?.nombre || 'Anycubic'}
          </span>
        </div>

        <div className="card-body p-3">
          <form onSubmit={handleCalcular} noValidate>

            {/* 0. DATOS DEL CLIENTE Y MEDIOS DE PAGO (PRIMERO, ANTES DE IMPRESORA) */}
            <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#0b0e14', border: '1px solid #2a2f3a' }}>
              <label className="small fw-bold text-info mb-2 d-block">
                DATOS DEL CLIENTE Y MEDIOS DE PAGO
              </label>
              <div className="row g-2 mb-2">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="Nombre del Cliente / Empresa"
                    value={form.clienteNombre || ''}
                    onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="Dirección del Cliente"
                    value={form.clienteDireccion || ''}
                    onChange={(e) => setForm({ ...form, clienteDireccion: e.target.value })}
                  />
                </div>
              </div>
              <div className="d-flex flex-wrap gap-3 pt-1">
                {OPCIONES_MEDIOS_PAGO.map((opcion) => (
                  <div className="form-check m-0" key={opcion.id}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`pago-${opcion.id}`}
                      checked={mediosSeleccionados.includes(opcion.label)}
                      onChange={() => toggleMedioPago(opcion.label)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      className="form-check-label small text-white"
                      htmlFor={`pago-${opcion.id}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {opcion.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 1. SELECCIÓN DE IMPRESORA */}
            <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#0b0e14', border: '1px solid #2a2f3a' }}>
              <label className="small fw-bold text-info mb-1 d-flex justify-content-between">
                <span>SELECCIONAR IMPRESORA</span>
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>{impresoraActual?.descripcion}</span>
              </label>
              <select
                className="form-select bg-dark text-white border-secondary fw-bold"
                value={form.impresoraId || 'kobra-combo'}
                onChange={e => {
                  const nuevaId = e.target.value;
                  const nuevaImp = PERFILES_IMPRESORAS[nuevaId];
                  setForm({
                    ...form,
                    impresoraId: nuevaId,
                    usaSecado: nuevaImp.tieneSecadoTermico ? form.usaSecado : false
                  });
                }}
                disabled={calculoFinalizado}
              >
                {Object.values(PERFILES_IMPRESORAS).map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.nombre} {imp.tieneSecadoTermico ? '(Secador Activo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. NOMBRE DEL PROYECTO */}
            <div className="mb-2">
              <input 
                type="text" 
                className="form-control bg-dark text-white border-secondary" 
                placeholder="Nombre del Proyecto (ej: Muñeco Caballeros del Zodíaco)" 
                required 
                value={form.nombreProyecto} 
                onChange={e => setForm({ ...form, nombreProyecto: e.target.value })} 
                disabled={calculoFinalizado} 
              />
            </div>

            {/* 3. MATERIAL Y PRECIO FILAMENTO */}
            <div className="row g-2 mb-2">
              <div className="col-6">
                <select 
                  className="form-select bg-dark text-info border-secondary" 
                  value={form.material} 
                  onChange={e => setForm({ ...form, material: e.target.value })} 
                  disabled={calculoFinalizado}
                >
                  <option value="PLA/PETG">PLA / PETG ({impresoraActual.consumos["PLA/PETG"]}W)</option>
                  <option value="ABS/ASA">ABS / ASA ({impresoraActual.consumos["ABS/ASA"]}W)</option>
                </select>
              </div>
              <div className="col-6">
                <input 
                  type="number" 
                  className="form-control bg-dark text-white border-secondary" 
                  placeholder="$/Kg Filamento" 
                  required 
                  value={form.precioFilamento} 
                  onChange={e => setForm({ ...form, precioFilamento: e.target.value })} 
                  disabled={calculoFinalizado} 
                />
              </div>
            </div>

            {/* 4. PESO Y TIEMPO */}
            <div className="row g-2 mb-2">
              <div className="col-4">
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control bg-dark text-white border-secondary" 
                  placeholder="Gramos" 
                  required 
                  value={form.pesoTotal} 
                  onChange={e => setForm({ ...form, pesoTotal: e.target.value })} 
                  disabled={calculoFinalizado} 
                />
              </div>
              <div className="col-4">
                <input 
                  type="number" 
                  className="form-control bg-dark text-white border-secondary" 
                  placeholder="Horas" 
                  required 
                  value={form.tiempoHoras} 
                  onChange={e => setForm({ ...form, tiempoHoras: e.target.value })} 
                  disabled={calculoFinalizado} 
                />
              </div>
              <div className="col-4">
                <input 
                  type="number" 
                  className="form-control bg-dark text-white border-secondary" 
                  placeholder="Minutos" 
                  value={form.tiempoMinutos} 
                  onChange={e => setForm({ ...form, tiempoMinutos: e.target.value })} 
                  disabled={calculoFinalizado} 
                />
              </div>
            </div>

            {/* 5. SECADO Y MARGEN DE GANANCIA LIBRE */}
            <div className="row g-2 mb-2 align-items-center">
              <div className="col-6">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="chkSecado" 
                    checked={form.usaSecado && impresoraActual.tieneSecadoTermico} 
                    onChange={e => setForm({ ...form, usaSecado: e.target.checked })} 
                    disabled={calculoFinalizado || !impresoraActual.tieneSecadoTermico} 
                  />
                  <label 
                    className={`form-check-label small ${impresoraActual.tieneSecadoTermico ? 'text-white' : 'text-muted'}`} 
                    htmlFor="chkSecado"
                  >
                    {impresoraActual.tieneSecadoTermico ? 'Secado Térmico (+65W ACE)' : 'Secado térmico no disp.'}
                  </label>
                </div>
              </div>
              <div className="col-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-dark text-info border-secondary fw-bold">Margen %</span>
                  <input 
                    type="number" 
                    className="form-control bg-dark text-info border-secondary fw-bold" 
                    placeholder="100, 200..." 
                    value={form.margenGanancia} 
                    onChange={e => setForm({ ...form, margenGanancia: e.target.value })} 
                    disabled={calculoFinalizado} 
                  />
                </div>
              </div>
            </div>

            {/* 6. INSUMOS EXTRAS Y MANO DE OBRA */}
            <div className="row g-2 mb-2">
              <div className="col-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-dark text-warning border-secondary fw-bold">Extras $</span>
                  <input 
                    type="number" 
                    className="form-control bg-dark text-white border-secondary" 
                    placeholder="LED, tornillos..."
                    value={form.insumosExternos} 
                    onChange={e => setForm({ ...form, insumosExternos: e.target.value })} 
                    disabled={calculoFinalizado} 
                  />
                </div>
              </div>
              <div className="col-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-dark text-white border-secondary">M. Obra $</span>
                  <input 
                    type="number" 
                    className="form-control bg-dark text-white border-secondary" 
                    value={form.manoObra} 
                    onChange={e => setForm({ ...form, manoObra: e.target.value })} 
                    disabled={calculoFinalizado} 
                  />
                </div>
              </div>
            </div>

            {/* NOTA DE EXTRAS */}
            <div className="mb-2">
              <input 
                type="text" 
                className="form-control form-control-sm bg-dark text-white border-secondary" 
                placeholder="Detalle de extras (ej: Tiras LED 12V + fuente + pegamento)" 
                value={form.detalleExtras || ""} 
                onChange={e => setForm({ ...form, detalleExtras: e.target.value })} 
                disabled={calculoFinalizado} 
              />
            </div>

            {/* DESCUENTO */}
            <div className="mb-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-dark text-danger border-secondary">Desc. %</span>
                <input 
                  type="number" 
                  className="form-control bg-dark text-white border-secondary" 
                  placeholder="0%" 
                  value={form.descuento} 
                  onChange={e => setForm({ ...form, descuento: e.target.value })} 
                  disabled={calculoFinalizado} 
                />
              </div>
            </div>

            {/* PUBLICAR EN CATÁLOGO */}
            <div className="card mb-3" style={{ backgroundColor: '#0b0e14', border: '1px solid #00d4ff' }}>
              <div className="card-header py-1 fw-bold" style={{ borderBottom: form.publicarCatalogo ? '1px solid #00d4ff' : 'none' }}>
                <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="switchCatalogo" 
                    checked={form.publicarCatalogo} 
                    onChange={e => setForm({ ...form, publicarCatalogo: e.target.checked })} 
                    disabled={calculoFinalizado} 
                  />
                  <label className="form-check-label small mt-1 text-white" htmlFor="switchCatalogo">
                    <span style={{ color: '#00d4ff' }}>🟢</span> PUBLICAR EN CATÁLOGO E-COMMERCE
                  </label>
                </div>
              </div>
              {form.publicarCatalogo && (
                <div className="card-body p-2">
                  <div className="mb-2">
                    <input 
                      type="text" 
                      className="form-control form-control-sm bg-dark text-white border-secondary" 
                      placeholder="URL de la foto del producto" 
                      value={form.imagenUrl} 
                      onChange={e => setForm({ ...form, imagenUrl: e.target.value })} 
                      disabled={calculoFinalizado} 
                    />
                  </div>
                  <div className="mb-2">
                    <textarea 
                      className="form-control form-control-sm bg-dark text-white border-secondary" 
                      placeholder="Descripción comercial para los clientes..." 
                      rows="2" 
                      value={form.descripcion} 
                      onChange={e => setForm({ ...form, descripcion: e.target.value })} 
                      disabled={calculoFinalizado}
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      className="form-control form-control-sm bg-dark text-white border-secondary" 
                      placeholder="Tiempo de espera (ej: 48hs a 72hs)" 
                      value={form.tiempoEspera} 
                      onChange={e => setForm({ ...form, tiempoEspera: e.target.value })} 
                      disabled={calculoFinalizado} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="d-flex gap-2">
              {calculoFinalizado ? (
                <button 
                  type="button" 
                  className="btn w-100 fw-bold" 
                  style={{ backgroundColor: '#00d4ff', color: '#0b0e14' }} 
                  onClick={iniciarNuevoCalculo}
                >
                  NUEVO CÁLCULO
                </button>
              ) : (
                <>
                  <button 
                    type="submit" 
                    className="btn w-100 fw-bold border-info text-info" 
                    style={{ backgroundColor: 'transparent' }}
                  >
                    {editandoId ? 'ACTUALIZAR PROYECTO' : 'CALCULAR Y GUARDAR'}
                  </button>
                  {editandoId && (
                    <button type="button" className="btn btn-secondary" onClick={cancelarEdicion}>
                      Cancelar
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* RESULTADO Y DESGLOSE FINANCIERO */}
      {ultimoResultado && (
        <div className="card border-info shadow" style={{ backgroundColor: '#151921' }}>
          <div className="card-header bg-dark text-info fw-bold small d-flex justify-content-between align-items-center">
            <span>RESUMEN FINANCIERO: {ultimoResultado.nombre}</span>
            <span className="badge bg-secondary">{ultimoResultado.impresoraNombre || '3D'}</span>
          </div>
          <div className="card-body p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted small">PRECIO FINAL SUGERIDO:</span>
              <span className="h3 fw-bold mb-0 font-mono" style={{ color: '#00ff88', letterSpacing: '0.5px' }}>
                {formatoMoneda(ultimoResultado.precioVenta)}
              </span>
            </div>

            <div className="row g-2 text-start small font-mono">
              <div className="col-6">
                <span className="text-muted">🧵 Material (+10%):</span>
                <span className="float-end text-white">{formatoMoneda(ultimoResultado.detalle?.material)}</span>
              </div>
              <div className="col-6">
                <span className="text-muted">⚡ Luz (EJESA):</span>
                <span className="float-end text-white">{formatoMoneda(ultimoResultado.detalle?.luz)}</span>
              </div>
              <div className="col-6">
                <span className="text-muted">🔧 Máquina & Service 500h:</span>
                <span className="float-end text-white">{formatoMoneda(ultimoResultado.detalle?.desgasteYService || ultimoResultado.detalle?.desgaste)}</span>
              </div>
              <div className="col-6">
                <span className="text-muted">💡 Extras (LEDs, etc.):</span>
                <span className="float-end text-warning">{formatoMoneda(ultimoResultado.detalle?.extras)}</span>
              </div>
              <div className="col-6">
                <span className="text-muted">🛠️ Mano de Obra (neta):</span>
                <span className="float-end text-white">{formatoMoneda(ultimoResultado.detalle?.manoObra)}</span>
              </div>
              <div className="col-12"><hr className="my-1 border-secondary" /></div>
              <div className="col-6">
                <span className="fw-bold text-muted">Costo Real Producción:</span>
                <span className="float-end fw-bold text-white">{formatoMoneda(ultimoResultado.costoProduccion)}</span>
              </div>
              <div className="col-6">
                <span className="fw-bold text-info">Margen Aplicado ({ultimoResultado.margenUsado}%):</span>
                <span className="float-end fw-bold text-info">
                  {formatoMoneda((ultimoResultado.precioOriginal || ultimoResultado.precioVenta) - ultimoResultado.costoProduccion)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalculadoraForm;
