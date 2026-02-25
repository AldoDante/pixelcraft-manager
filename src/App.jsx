import React, { useState, useEffect } from 'react';
import { calcularPresupuestoFinal } from './utils/calculos';
import ListaProyectos from './components/ListaProyectos';
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';

function App() {
  const [config, setConfig] = useState(() => ({
    kwh: localStorage.getItem('pixelcraft_kWh') || 120,
    margen: localStorage.getItem('pixelcraft_margen') || 50
  }));

  const [proyectos, setProyectos] = useState([]);
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
  }, [config]);

  useEffect(() => {
    const q = query(collection(db, "calculos"), orderBy("id", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsProyectos = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      }));
      setProyectos(docsProyectos);
    });
    return () => unsubscribe();
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
    
    // Mantenemos precio del filamento, borramos el resto
    setForm(prev => ({
      ...prev,
      nombreProyecto: "",
      pesoTotal: "",
      tiempoHoras: "",
      tiempoMinutos: ""
    }));
  };

  const handleCalcular = async (e) => {
    e.preventDefault();

    // --- VALIDACIÓN MANUAL (Para evitar el cartel del navegador) ---
    if (!form.nombreProyecto || !form.pesoTotal || !form.tiempoHoras) {
      // Si falta algo, simplemente no hacemos nada (o podrías poner un alert suave)
      return; 
    }

    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);

    const resultadoCalculo = calcularPresupuestoFinal({
      ...form,
      tiempoTotal: tiempoDecimal,
      costoKWh: config.kwh,
      margenGanancia: config.margen,
      precioFilamento: form.precioFilamento
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
        const docRef = doc(db, "calculos", editandoId);
        await updateDoc(docRef, datosAGuardar);
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
    if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará todo el historial.")) {
      proyectos.forEach(async (p) => {
        await deleteDoc(doc(db, "calculos", p.firestoreId));
      });
      cancelarEdicion();
    }
  };

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
                <label className="small fw-bold">Margen %</label>
                <input type="number" className="form-control form-control-sm fw-bold" 
                  value={config.margen} onChange={e => setConfig({...config, margen: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 col-md-5">
          <div className={`card shadow border-0 mb-3 ${editandoId ? 'border-warning border-3' : ''}`}>
            
            <div className={`card-header fw-bold text-white ${
              calculoFinalizado ? 'bg-info text-dark' : 
              editandoId ? 'bg-warning text-dark' : 'bg-dark' 
            }`}>
              {calculoFinalizado ? '✅ PROYECTO GUARDADO' : 
               editandoId ? '✏️ EDITANDO PROYECTO' : 'Nueva Impresión'}
            </div>

            <div className="card-body">
              {/* AGREGAMOS noValidate PARA QUITAR ALERTAS DEL NAVEGADOR */}
              <form onSubmit={handleCalcular} noValidate>
                <div className="mb-2">
                  <input type="text" className="form-control" placeholder="Nombre del Proyecto" required
                    value={form.nombreProyecto} onChange={e => setForm({...form, nombreProyecto: e.target.value})} 
                    disabled={calculoFinalizado}
                  />
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
                      value={form.precioFilamento} onChange={e => setForm({...form, precioFilamento: e.target.value})} 
                      disabled={calculoFinalizado}
                    />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-4">
                    <input type="number" step="0.01" className="form-control" placeholder="Gramos" required 
                      value={form.pesoTotal} onChange={e => setForm({...form, pesoTotal: e.target.value})} 
                      disabled={calculoFinalizado}
                    />
                  </div>
                  <div className="col-4">
                    <input type="number" className="form-control" placeholder="Horas" required 
                      value={form.tiempoHoras} onChange={e => setForm({...form, tiempoHoras: e.target.value})} 
                      disabled={calculoFinalizado}
                    />
                  </div>
                  <div className="col-4">
                    <input type="number" className="form-control" placeholder="Minutos" required 
                      value={form.tiempoMinutos} onChange={e => setForm({...form, tiempoMinutos: e.target.value})} 
                      disabled={calculoFinalizado}
                    />
                  </div>
                </div>
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="chkSecado" 
                    checked={form.usaSecado} onChange={e => setForm({...form, usaSecado: e.target.checked})} 
                    disabled={calculoFinalizado}
                  />
                  <label className="form-check-label small" htmlFor="chkSecado">Secado (+65W)</label>
                </div>

                <div className="d-flex gap-2">
                  {calculoFinalizado ? (
                    <button type="button" className="btn btn-info w-100 fw-bold text-dark animate__animated animate__pulse animate__infinite" onClick={iniciarNuevoCalculo}>
                      ✨ NUEVO CÁLCULO (Limpiar)
                    </button>
                  ) : (
                    <>
                      <button type="submit" className={`btn w-100 fw-bold ${editandoId ? 'btn-warning text-dark' : 'btn-primary'}`}>
                        {editandoId ? 'ACTUALIZAR PROYECTO' : 'GUARDAR EN LA NUBE'}
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

          {ultimoResultado && (
            <div className="card border-primary shadow animate__animated animate__fadeInUp">
              <div className="card-body text-center">
                <h5 className="text-primary fw-bold mb-3">{ultimoResultado.nombre}</h5>
                <div className="row g-2 justify-content-center">
                  <div className={parseFloat(ultimoResultado.margenUsado) > 0 ? "col-6" : "col-12"}>
                    <div className="p-2 bg-light border rounded">
                      <small className="text-muted fw-bold d-block">COSTO</small>
                      <span className="h4 text-secondary">{formatoMoneda(ultimoResultado.costoProduccion)}</span>
                    </div>
                  </div>
                  {parseFloat(ultimoResultado.margenUsado) > 0 && (
                    <div className="col-6">
                      <div className="p-2 bg-primary bg-opacity-10 border border-primary rounded">
                        <small className="text-primary fw-bold d-block">VENTA</small>
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
          <ListaProyectos 
            proyectos={proyectos} 
            eliminarProyecto={eliminarProyecto}
            limpiarTodo={limpiarTodo}
            cargarParaEditar={cargarParaEditar} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;