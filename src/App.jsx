import React, { useState, useEffect } from 'react';
import { calcularPresupuestoFinal } from './utils/calculos';
import ListaProyectos from './components/ListaProyectos';
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';

function App() {
  const [config, setConfig] = useState(() => ({
    kwh: localStorage.getItem('pixelcraft_kWh') || 120,
    margen: localStorage.getItem('pixelcraft_margen') || 50,
    valorMaquina: localStorage.getItem('pixelcraft_valorMaquina') || 1200000,
    mantenimientoHora: localStorage.getItem('pixelcraft_mantenimiento') || 500
  }));

  const [proyectos, setProyectos] = useState([]);
  const [ventas, setVentas] = useState([]); // <-- NUEVO: Estado para las ventas
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [calculoFinalizado, setCalculoFinalizado] = useState(false);

  const [form, setForm] = useState({
    nombreProyecto: "", material: "PLA/PETG", pesoTotal: "", precioFilamento: "", 
    tiempoHoras: "", tiempoMinutos: "", usaSecado: false
  });

  useEffect(() => {
    localStorage.setItem('pixelcraft_kWh', config.kwh);
    localStorage.setItem('pixelcraft_margen', config.margen);
    localStorage.setItem('pixelcraft_valorMaquina', config.valorMaquina);
    localStorage.setItem('pixelcraft_mantenimiento', config.mantenimientoHora);
  }, [config]);

  // Firebase: Escuchar Cotizaciones y Ventas
  useEffect(() => {
    // Escucha Cotizaciones
    const qProyectos = query(collection(db, "calculos"), orderBy("id", "desc"));
    const unsubProyectos = onSnapshot(qProyectos, (snapshot) => {
      setProyectos(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });

    // <-- NUEVO: Escucha Ventas
    const qVentas = query(collection(db, "ventas"), orderBy("id", "desc"));
    const unsubVentas = onSnapshot(qVentas, (snapshot) => {
      setVentas(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProyectos();
      unsubVentas();
    };
  }, []);

  const cargarParaEditar = (proyecto) => {
    setEditandoId(proyecto.firestoreId);
    setCalculoFinalizado(false);
    const horasTotales = proyecto.tiempoTotal || proyecto.horas || 0;
    
    setForm({
      nombreProyecto: proyecto.nombre || "",
      material: proyecto.material || "PLA/PETG",
      pesoTotal: proyecto.pesoTotal || proyecto.peso || "", 
      precioFilamento: proyecto.precioFilamento || "", 
      tiempoHoras: Math.floor(horasTotales), 
      tiempoMinutos: Math.round((horasTotales % 1) * 60), 
      usaSecado: proyecto.secado || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setCalculoFinalizado(false);
    setForm({ nombreProyecto: "", material: "PLA/PETG", pesoTotal: "", precioFilamento: "", tiempoHoras: "", tiempoMinutos: "", usaSecado: false });
    setUltimoResultado(null);
  };

  const iniciarNuevoCalculo = () => {
    setCalculoFinalizado(false);
    setUltimoResultado(null);
    setEditandoId(null);
    setForm(prev => ({ ...prev, nombreProyecto: "", pesoTotal: "", tiempoHoras: "", tiempoMinutos: "" }));
  };

  const handleCalcular = async (e) => {
    e.preventDefault();
    if (!form.nombreProyecto || !form.pesoTotal || !form.tiempoHoras) return; 

    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);

    const resultadoCalculo = calcularPresupuestoFinal({
      ...form,
      tiempoTotal: tiempoDecimal,
      costoKWh: config.kwh,
      margenGanancia: config.margen,
      precioFilamento: form.precioFilamento,
      valorMaquina: config.valorMaquina,
      mantenimientoHora: config.mantenimientoHora
    });
    
    const datosAGuardar = {
      ...resultadoCalculo,
      nombre: form.nombreProyecto,
      pesoTotal: form.pesoTotal,
      precioFilamento: form.precioFilamento,
      horas: tiempoDecimal,
      tiempoTotal: tiempoDecimal,
      material: form.material,
      secado: form.usaSecado,
      id: Date.now()
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, "calculos", editandoId), datosAGuardar);
        setEditandoId(null);
      } else {
        await addDoc(collection(db, "calculos"), datosAGuardar);
      }
      setUltimoResultado(datosAGuardar);
      setCalculoFinalizado(true); 
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar. Revisa tu conexión.");
    }
  };

  const eliminarProyecto = async (idFirestore) => {
    if (confirm("¿Borrar este proyecto?")) {
      await deleteDoc(doc(db, "calculos", idFirestore));
      if (editandoId === idFirestore) cancelarEdicion();
    }
  };

  const limpiarTodo = async () => {
    if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará todo el historial de cotizaciones.")) {
      proyectos.forEach(async (p) => await deleteDoc(doc(db, "calculos", p.firestoreId)));
      cancelarEdicion();
    }
  };

  // <-- NUEVO: Funciones para Ventas
  const registrarVenta = async (proyecto) => {
    if (confirm(`💸 ¿Registrar "${proyecto.nombre}" como VENTA CONCRETADA por ${formatoMoneda(proyecto.precioVenta)}?`)) {
      try {
        await addDoc(collection(db, "ventas"), {
          nombre: proyecto.nombre,
          precioVenta: proyecto.precioVenta,
          costoProduccion: proyecto.costoProduccion,
          fechaVenta: Date.now(),
          id: Date.now()
        });
        // Opcional: Podrías hacer un alert("Venta registrada!") o usar un toast
      } catch (error) {
        console.error("Error al registrar venta:", error);
      }
    }
  };

  const eliminarVenta = async (idFirestore) => {
    if (confirm("¿Borrar este registro de venta?")) {
      await deleteDoc(doc(db, "ventas", idFirestore));
    }
  };

  // <-- NUEVO: Cálculo del total del pozo de ventas
  const totalVentas = ventas.reduce((acc, venta) => acc + (parseFloat(venta.precioVenta) || 0), 0);

  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  return (
    <div className="container-fluid py-4">
      <h1 className="text-center text-primary fw-bold mb-4">Pixelcraft 3D Cloud</h1>

      <div className="row g-3">
        <div className="col-lg-2 col-md-3">
          <div className="card shadow-sm border-warning">
            <div className="card-header bg-warning text-dark fw-bold small text-center">AJUSTES LOCALES</div>
            <div className="card-body p-2">
              <div className="mb-2">
                <label className="small fw-bold">Tarifa KWh</label>
                <input type="number" step="0.01" className="form-control form-control-sm fw-bold" 
                  value={config.kwh} onChange={e => setConfig({...config, kwh: e.target.value})} />
              </div>
              <div className="mb-2">
                <label className="small fw-bold" title="Valor actual de la Kobra S1">Máquina ($)</label>
                <input type="number" className="form-control form-control-sm fw-bold" 
                  value={config.valorMaquina} onChange={e => setConfig({...config, valorMaquina: e.target.value})} />
              </div>
              <div className="mb-2">
                <label className="small fw-bold" title="Fondo para boquillas y correas">Desgaste ($/h)</label>
                <input type="number" className="form-control form-control-sm fw-bold" 
                  value={config.mantenimientoHora} onChange={e => setConfig({...config, mantenimientoHora: e.target.value})} />
              </div>
              <div className="mb-2">
                <label className="small fw-bold">Margen %</label>
                <input type="number" className="form-control form-control-sm fw-bold" 
                  value={config.margen} onChange={e => setConfig({...config, margen: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 col-md-5">
          <div className={`card shadow border-0 mb-3 ${editandoId ? 'border-warning border-3' : ''}`}>
            <div className={`card-header fw-bold text-white ${calculoFinalizado ? 'bg-info text-dark' : editandoId ? 'bg-warning text-dark' : 'bg-dark'}`}>
              {calculoFinalizado ? '✅ PROYECTO GUARDADO' : editandoId ? '✏️ EDITANDO PROYECTO' : '🖨️ Nueva Impresión'}
            </div>
            <div className="card-body">
              <form onSubmit={handleCalcular} noValidate>
                <div className="mb-2">
                  <input type="text" className="form-control" placeholder="Nombre del Proyecto" required
                    value={form.nombreProyecto} onChange={e => setForm({...form, nombreProyecto: e.target.value})} 
                    disabled={calculoFinalizado} />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <select className="form-select" value={form.material} onChange={e => setForm({...form, material: e.target.value})} disabled={calculoFinalizado}>
                      <option value="PLA/PETG">PLA/PETG (110W)</option>
                      <option value="ABS/ASA">ABS / ASA (190W)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <input type="number" className="form-control" placeholder="$/Kg Filamento" required 
                      value={form.precioFilamento} onChange={e => setForm({...form, precioFilamento: e.target.value})} disabled={calculoFinalizado} />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-4">
                    <input type="number" step="0.01" className="form-control" placeholder="Gramos" required 
                      value={form.pesoTotal} onChange={e => setForm({...form, pesoTotal: e.target.value})} disabled={calculoFinalizado} />
                  </div>
                  <div className="col-4">
                    <input type="number" className="form-control" placeholder="Horas" required 
                      value={form.tiempoHoras} onChange={e => setForm({...form, tiempoHoras: e.target.value})} disabled={calculoFinalizado} />
                  </div>
                  <div className="col-4">
                    <input type="number" className="form-control" placeholder="Minutos" required 
                      value={form.tiempoMinutos} onChange={e => setForm({...form, tiempoMinutos: e.target.value})} disabled={calculoFinalizado} />
                  </div>
                </div>
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="chkSecado" 
                    checked={form.usaSecado} onChange={e => setForm({...form, usaSecado: e.target.checked})} disabled={calculoFinalizado} />
                  <label className="form-check-label small" htmlFor="chkSecado">Secado (+200W ACE Pro)</label>
                </div>

                <div className="d-flex gap-2">
                  {calculoFinalizado ? (
                    <button type="button" className="btn btn-info w-100 fw-bold text-dark animate__animated animate__pulse animate__infinite" onClick={iniciarNuevoCalculo}>
                       NUEVO CÁLCULO
                    </button>
                  ) : (
                    <>
                      <button type="submit" className={`btn w-100 fw-bold ${editandoId ? 'btn-warning text-dark' : 'btn-primary'}`}>
                        {editandoId ? 'ACTUALIZAR PROYECTO' : 'CALCULAR'}
                      </button>
                      {editandoId && <button type="button" className="btn btn-secondary" onClick={cancelarEdicion}>Cancelar</button>}
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>

          {ultimoResultado && (
            <div className="card border-primary shadow animate__animated animate__fadeInUp">
              <div className="card-body text-center">
                <h5 className="text-primary fw-bold mb-3">{ultimoResultado.nombre}</h5>
                <div className="row g-2 justify-content-center">
                  <div className={parseFloat(ultimoResultado.margenUsado) > 0 ? "col-6" : "col-12"}>
                    <div className="p-2 bg-light border rounded">
                      <small className="text-muted fw-bold d-block">COSTO REAL</small>
                      <span className="h4 text-secondary">{formatoMoneda(ultimoResultado.costoProduccion)}</span>
                    </div>
                  </div>
                  {parseFloat(ultimoResultado.margenUsado) > 0 && (
                    <div className="col-6">
                      {/* <-- NUEVO: Hacemos la caja de venta clickeable */}
                      <div 
                        className="p-2 bg-primary bg-opacity-10 border border-primary rounded"
                        style={{ cursor: 'pointer', transition: '0.2s' }}
                        onClick={() => registrarVenta(ultimoResultado)}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.1)'}
                        title="¡Click para registrar esta venta!"
                      >
                        <small className="text-primary fw-bold d-block">VENTA (Click para registrar)</small>
                        <span className="h4 text-primary fw-bold">{formatoMoneda(ultimoResultado.precioVenta)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4 col-md-4">
          {/* Historial de Cotizaciones original */}
          <ListaProyectos 
            proyectos={proyectos} 
            eliminarProyecto={eliminarProyecto}
            limpiarTodo={limpiarTodo}
            cargarParaEditar={cargarParaEditar} 
          />

          {/* <-- NUEVO: Panel de Historial de Ventas */}
          <div className="card bg-dark border-success mt-4 shadow">
            <div className="card-header bg-success text-white fw-bold d-flex justify-content-between align-items-center">
              <span>💰 HISTORIAL DE VENTAS ({ventas.length})</span>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {ventas.length === 0 ? (
                <div className="text-center p-3 text-muted small">Aún no hay ventas registradas. ¡A imprimir!</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {ventas.map(v => (
                    <li key={v.firestoreId} className="list-group-item bg-dark text-white border-secondary d-flex justify-content-between align-items-center">
                      <div>
                        <span className="d-block fw-bold">{v.nombre}</span>
                        <small className="text-muted">Ganancia est.: {formatoMoneda(v.precioVenta - v.costoProduccion)}</small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-success fw-bold">{formatoMoneda(v.precioVenta)}</span>
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={() => eliminarVenta(v.firestoreId)} title="Eliminar Venta">
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card-footer bg-success bg-opacity-25 border-success d-flex justify-content-between align-items-center">
              <span className="text-white fw-bold">TOTAL RECAUDADO:</span>
              <span className="h5 text-success fw-bold m-0">{formatoMoneda(totalVentas)}</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default App;