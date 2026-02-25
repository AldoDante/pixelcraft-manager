import React, { useState, useEffect } from 'react';
import { calcularPresupuestoFinal } from './utils/calculos';
import ListaProyectos from './components/ListaProyectos';
// 1. Importamos la conexión a Firebase y las funciones de base de datos
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

// NOTA: Asegúrate de mantener la importación de tus estilos en main.jsx

function App() {
  // --- CONFIGURACIÓN (Se queda en LocalStorage porque es preferencia de TU dispositivo) ---
  const [config, setConfig] = useState(() => ({
    kwh: localStorage.getItem('pixelcraft_kWh') || 120,
    margen: localStorage.getItem('pixelcraft_margen') || 50
  }));

  // --- PROYECTOS (Ahora vienen de la NUBE ☁️) ---
  const [proyectos, setProyectos] = useState([]);
  const [ultimoResultado, setUltimoResultado] = useState(null);

  // --- FORMULARIO ---
  const [form, setForm] = useState({
    nombreProyecto: "", material: "PLA/PETG", pesoTotal: "", precioFilamento: "", 
    tiempoHoras: "", tiempoMinutos: "", usaSecado: false
  });

  // 1. EFECTO: Guardar Configuración localmente
  useEffect(() => {
    localStorage.setItem('pixelcraft_kWh', config.kwh);
    localStorage.setItem('pixelcraft_margen', config.margen);
  }, [config]);

  // 2. EFECTO: Conexión en Tiempo Real con Firebase
  useEffect(() => {
    // Creamos una consulta para pedir los datos ordenados
    const q = query(collection(db, "calculos"), orderBy("id", "desc"));
    
    // Nos "suscribimos" a los cambios. Si agregas algo desde el celular, aparece aquí al instante.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsProyectos = snapshot.docs.map(doc => ({
        firestoreId: doc.id, // Guardamos el ID real de la nube para poder borrarlo luego
        ...doc.data()
      }));
      setProyectos(docsProyectos);
    });

    return () => unsubscribe(); // Limpieza al salir
  }, []);

  // --- FUNCIONES ---

  const handleCalcular = async (e) => {
    e.preventDefault();
    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);

    const nuevoProyecto = calcularPresupuestoFinal({
      ...form,
      tiempoTotal: tiempoDecimal,
      costoKWh: config.kwh,
      margenGanancia: config.margen,
      precioFilamento: form.precioFilamento
    });
    
    try {
      // EN LUGAR DE SETSTATE, GUARDAMOS EN LA NUBE
      await addDoc(collection(db, "calculos"), nuevoProyecto);
      
      setUltimoResultado(nuevoProyecto); // Mostramos la tarjeta grande
      setForm({...form, nombreProyecto: "", pesoTotal: "", tiempoHoras: "", tiempoMinutos: ""});
    } catch (error) {
      console.error("Error al guardar en la nube:", error);
      alert("Hubo un error al guardar. Revisa tu conexión.");
    }
  };

  const eliminarProyecto = async (index) => {
    // Buscamos el ID de Firebase usando el índice de la lista
    const idParaBorrar = proyectos[index].firestoreId;
    if (confirm("¿Borrar este proyecto de la nube?")) {
      await deleteDoc(doc(db, "calculos", idParaBorrar));
    }
  };

  const limpiarTodo = async () => {
    if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará todo el historial de la base de datos.")) {
      // Borramos uno por uno (Firebase no tiene 'borrar todo' nativo simple)
      proyectos.forEach(async (p) => {
        await deleteDoc(doc(db, "calculos", p.firestoreId));
      });
    }
  };

  // Función auxiliar de moneda
  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  return (
    <div className="container-fluid py-4">
      <h1 className="text-center text-primary fw-bold mb-4">Pixelcraft 3D Cloud</h1>

      <div className="row g-3">
        {/* COLUMNA 1: AJUSTES */}
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

        {/* COLUMNA 2: CALCULADORA */}
        <div className="col-lg-6 col-md-5">
          <div className="card shadow border-0 mb-3">
            <div className="card-header bg-dark text-white fw-bold">Nueva Impresión</div>
            <div className="card-body">
              <form onSubmit={handleCalcular}>
                <div className="mb-2">
                  <input type="text" className="form-control" placeholder="Nombre del Proyecto" required
                    value={form.nombreProyecto} onChange={e => setForm({...form, nombreProyecto: e.target.value})} />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <select className="form-select" value={form.material} onChange={e => setForm({...form, material: e.target.value})}>
                      <option value="PLA/PETG">PLA/PETG (110W)</option>
                      <option value="ABS/ASA">ABS / ASA (190W)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <input type="number" className="form-control" placeholder="$/Kg Filamento" required value={form.precioFilamento} onChange={e => setForm({...form, precioFilamento: e.target.value})} />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-4">
                    <input type="number" step="0.01" className="form-control" placeholder="Gramos" required value={form.pesoTotal} onChange={e => setForm({...form, pesoTotal: e.target.value})} />
                  </div>
                  <div className="col-4">
                    <input type="number" className="form-control" placeholder="Horas" required value={form.tiempoHoras} onChange={e => setForm({...form, tiempoHoras: e.target.value})} />
                  </div>
                  <div className="col-4">
                    <input type="number" className="form-control" placeholder="Minutos" required value={form.tiempoMinutos} onChange={e => setForm({...form, tiempoMinutos: e.target.value})} />
                  </div>
                </div>
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="chkSecado" checked={form.usaSecado} onChange={e => setForm({...form, usaSecado: e.target.checked})} />
                  <label className="form-check-label small" htmlFor="chkSecado">Secado (+65W)</label>
                </div>
                <button type="submit" className="btn btn-primary w-100 fw-bold">CALCULAR</button>
              </form>
            </div>
          </div>

          {/* RESULTADO GRANDE */}
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

        {/* COLUMNA 3: LISTA (Ahora conectada a Firebase) */}
        <div className="col-lg-4 col-md-4">
          <ListaProyectos 
            proyectos={proyectos} 
            eliminarProyecto={eliminarProyecto}
            limpiarTodo={limpiarTodo}
          />
        </div>
      </div>
    </div>
  );
}

export default App;