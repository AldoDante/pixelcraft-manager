import React, { useState, useEffect } from 'react';
import { calcularPresupuestoFinal } from '../utils/calculos';
import ListaProyectos from '../components/ListaProyectos';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom'; // <-- IMPORTANTE: Agregamos Link para navegar

function AdminPanel() {
 // === SISTEMA DE LOGIN HARDCODEADO ===
  // Iniciamos el estado leyendo si ya hay una sesión guardada
  const [isLogged, setIsLogged] = useState(() => {
    return localStorage.getItem('pixelcraft_logged') === 'true';
  });
  const [credenciales, setCredenciales] = useState({ usuario: '', password: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (credenciales.usuario === 'pixel' && credenciales.password === 'pixel') {
      setIsLogged(true);
      // Guardamos la sesión en el navegador
      localStorage.setItem('pixelcraft_logged', 'true');
    } else {
      alert("Credenciales incorrectas. Intenta de nuevo.");
    }
  };

  // Función nueva para manejar el cierre de sesión
  const handleLogout = () => {
    setIsLogged(false);
    // Borramos el registro del navegador
    localStorage.removeItem('pixelcraft_logged');
  };

  // === ESTADOS DE LA CALCULADORA Y AUTOGESTIÓN ===
  const [config, setConfig] = useState(() => ({
    kwh: localStorage.getItem('pixelcraft_kWh') || 120,
    margen: localStorage.getItem('pixelcraft_margen') || 50,
    valorMaquina: localStorage.getItem('pixelcraft_valorMaquina') || 1200000,
    mantenimientoHora: localStorage.getItem('pixelcraft_mantenimiento') || 500
  }));

  const [proyectos, setProyectos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [calculoFinalizado, setCalculoFinalizado] = useState(false);

  const [form, setForm] = useState({
    nombreProyecto: "", material: "PLA/PETG", pesoTotal: "", precioFilamento: "", 
    tiempoHoras: "", tiempoMinutos: "", usaSecado: false, descuento: "",
    insumosExternos: "", manoObra: "",
    publicarCatalogo: false, descripcion: "", imagenUrl: "", tiempoEspera: "" 
  });

  useEffect(() => {
    localStorage.setItem('pixelcraft_kWh', config.kwh);
    localStorage.setItem('pixelcraft_margen', config.margen);
    localStorage.setItem('pixelcraft_valorMaquina', config.valorMaquina);
    localStorage.setItem('pixelcraft_mantenimiento', config.mantenimientoHora);
  }, [config]);

  useEffect(() => {
    if (!isLogged) return;

    const qProyectos = query(collection(db, "calculos"), orderBy("id", "desc"));
    const unsubProyectos = onSnapshot(qProyectos, (snapshot) => {
      setProyectos(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });

    const qVentas = query(collection(db, "ventas"), orderBy("id", "desc"));
    const unsubVentas = onSnapshot(qVentas, (snapshot) => {
      setVentas(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });

    return () => { unsubProyectos(); unsubVentas(); };
  }, [isLogged]);

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
      usaSecado: proyecto.secado || false,
      descuento: proyecto.descuento || "",
      insumosExternos: proyecto.insumosExternos || "", 
      manoObra: proyecto.manoObra || "",
      publicarCatalogo: proyecto.publicarCatalogo || false,
      descripcion: proyecto.descripcion || "",
      imagenUrl: proyecto.imagenUrl || "",
      tiempoEspera: proyecto.tiempoEspera || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setCalculoFinalizado(false);
    setForm({ nombreProyecto: "", material: "PLA/PETG", pesoTotal: "", precioFilamento: "", tiempoHoras: "", tiempoMinutos: "", usaSecado: false, descuento: "", insumosExternos: "", manoObra: "", publicarCatalogo: false, descripcion: "", imagenUrl: "", tiempoEspera: "" });
    setUltimoResultado(null);
  };

  const iniciarNuevoCalculo = () => {
    setCalculoFinalizado(false);
    setUltimoResultado(null);
    setEditandoId(null);
    setForm(prev => ({ ...prev, nombreProyecto: "", pesoTotal: "", tiempoHoras: "", tiempoMinutos: "", descuento: "", insumosExternos: "", manoObra: "", publicarCatalogo: false, descripcion: "", imagenUrl: "", tiempoEspera: "" }));
  };

  const handleCalcular = async (e) => {
    e.preventDefault();
    if (!form.nombreProyecto || form.pesoTotal === "" || form.tiempoHoras === "") return; 

    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);

    const resultadoCalculo = calcularPresupuestoFinal({
      ...form, tiempoTotal: tiempoDecimal, costoKWh: config.kwh, margenGanancia: config.margen, precioFilamento: form.precioFilamento, valorMaquina: config.valorMaquina, mantenimientoHora: config.mantenimientoHora
    });
    
    const datosAGuardar = {
      nombre: form.nombreProyecto, pesoTotal: form.pesoTotal, precioFilamento: form.precioFilamento, horas: tiempoDecimal, tiempoTotal: tiempoDecimal, material: form.material, secado: form.usaSecado, descuento: form.descuento, insumosExternos: form.insumosExternos, manoObra: form.manoObra,
      costoProduccion: resultadoCalculo.costoProduccion, precioVenta: resultadoCalculo.precioVenta, precioOriginal: resultadoCalculo.precioOriginal, montoDescuento: resultadoCalculo.montoDescuento, margenUsado: config.margen, detalle: resultadoCalculo.detalle,
      publicarCatalogo: form.publicarCatalogo, descripcion: form.descripcion, imagenUrl: form.imagenUrl, tiempoEspera: form.tiempoEspera
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, "calculos", editandoId), datosAGuardar);
        setEditandoId(null);
        setCalculoFinalizado(false); 
        cancelarEdicion();
      } else {
        datosAGuardar.id = Date.now(); 
        await addDoc(collection(db, "calculos"), datosAGuardar);
        setCalculoFinalizado(true); 
      }
      setUltimoResultado(datosAGuardar);
    } catch (error) {
      console.error("Error en Firebase:", error);
      alert("Error al guardar.");
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
      proyectos.forEach(async (p) => await deleteDoc(doc(db, "calculos", p.firestoreId)));
      cancelarEdicion();
    }
  };

  const totalVentas = ventas.reduce((acc, venta) => acc + (parseFloat(venta.precioVenta) || 0), 0);
  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  // === RENDERIZADO DEL LOGIN SI NO ESTÁ LOGUEADO ===
  if (!isLogged) {
    return (
      <div className="container-fluid d-flex flex-column min-vh-100 p-0" style={{ backgroundColor: '#0b0e14' }}>
        <nav className="navbar-public">
          <div className="brand">
            <div className="pixel-logo">P</div>
            <div className="brand-text">
              <span>PIXEL</span><span>CRAFT</span>
            </div>
          </div>
          <Link to="/" className="btn-login text-decoration-none">VOLVER AL CATÁLOGO</Link>
        </nav>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="card shadow-lg border-info" style={{ width: '350px', backgroundColor: '#151921' }}>
            <div className="card-header bg-dark border-info text-center">
               <h4 style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '10pt', margin: '15px 0' }}>PIXELCRAFT ADMIN</h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="text-white small">Usuario</label>
                  <input type="text" className="form-control bg-dark text-white border-secondary" 
                    value={credenciales.usuario} onChange={(e) => setCredenciales({...credenciales, usuario: e.target.value})} required/>
                </div>
                <div className="mb-4">
                  <label className="text-white small">Contraseña</label>
                  <input type="password" className="form-control bg-dark text-white border-secondary" 
                    value={credenciales.password} onChange={(e) => setCredenciales({...credenciales, password: e.target.value})} required/>
                </div>
                <button type="submit" className="btn w-100 fw-bold text-dark" style={{ backgroundColor: '#00d4ff' }}>INGRESAR</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === RENDERIZADO DE LA CALCULADORA (Si está logueado) ===
  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#0b0e14' }}>
      
      {/* NAVEGACIÓN ADMIN */}
      <nav className="navbar-public">
        <div className="brand">
          <div className="pixel-logo">P</div>
          <div className="brand-text">
            <span>PIXEL</span>
            <span>CRAFT</span>
          </div>
        </div>
        <div className="nav-links d-none d-md-flex align-items-center">
          <Link to="/" className="nav-link text-decoration-none">Ver Catálogo Público</Link>
        </div>
        <button onClick={() => setIsLogged(false)} className="btn-login" style={{ borderColor: '#ff4444', color: '#ff4444' }}>CERRAR SESIÓN</button>
      </nav>

      {/* CONTENIDO PRINCIPAL DE LA CALCULADORA */}
      <div className="container-fluid py-4 flex-grow-1">
        <h1 className="text-center fw-bold mb-4" style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0,212,255,0.6)', fontFamily: "'Press Start 2P', monospace", fontSize: '20px' }}>
          PIXELCRAFT 3D CLOUD
        </h1>

        <div className="row g-3">
          {/* PANEL AJUSTES LOCALES */}
          <div className="col-lg-2 col-md-3">
              <div className="card shadow-sm border-warning" style={{ backgroundColor: '#151921' }}>
                <div className="card-header bg-warning text-dark fw-bold small text-center">AJUSTES LOCALES</div>
                <div className="card-body p-2">
                  <div className="mb-2"><label className="small fw-bold text-white">Tarifa KWh</label><input type="number" step="0.01" className="form-control form-control-sm bg-dark text-info border-secondary fw-bold" value={config.kwh} onChange={e => setConfig({...config, kwh: e.target.value})} /></div>
                  <div className="mb-2"><label className="small fw-bold text-white">Máquina ($)</label><input type="number" className="form-control form-control-sm bg-dark text-info border-secondary fw-bold" value={config.valorMaquina} onChange={e => setConfig({...config, valorMaquina: e.target.value})} /></div>
                  <div className="mb-2"><label className="small fw-bold text-white">Desgaste ($/h)</label><input type="number" className="form-control form-control-sm bg-dark text-info border-secondary fw-bold" value={config.mantenimientoHora} onChange={e => setConfig({...config, mantenimientoHora: e.target.value})} /></div>
                  <div className="mb-2"><label className="small fw-bold text-white">Margen %</label><input type="number" className="form-control form-control-sm bg-dark text-info border-secondary fw-bold" value={config.margen} onChange={e => setConfig({...config, margen: e.target.value})} /></div>
                </div>
              </div>
          </div>

          {/* PANEL CALCULADORA + AUTOGESTIÓN */}
          <div className="col-lg-6 col-md-5">
            <div className={`card shadow mb-3 ${editandoId ? 'border-warning' : 'border-info'}`} style={{ backgroundColor: '#151921', borderWidth: '2px' }}>
              <div className="card-header text-white fw-bold d-flex align-items-center gap-2" style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #2a2f3a' }}>
                <span>🖨️</span> {calculoFinalizado ? 'PROYECTO GUARDADO' : editandoId ? 'EDITANDO PROYECTO' : 'NUEVA IMPRESIÓN'}
              </div>
              <div className="card-body">
                <form onSubmit={handleCalcular} noValidate>
                  <div className="mb-2"><input type="text" className="form-control bg-dark text-white border-secondary" placeholder="Nombre del Proyecto" required value={form.nombreProyecto} onChange={e => setForm({...form, nombreProyecto: e.target.value})} disabled={calculoFinalizado} /></div>
                  <div className="row g-2 mb-2">
                    <div className="col-6"><select className="form-select bg-dark text-info border-secondary" value={form.material} onChange={e => setForm({...form, material: e.target.value})} disabled={calculoFinalizado}><option value="PLA/PETG">PLA/PETG (110W)</option><option value="ABS/ASA">ABS / ASA (190W)</option></select></div>
                    <div className="col-6"><input type="number" className="form-control bg-dark text-white border-secondary" placeholder="$/Kg Filamento" required value={form.precioFilamento} onChange={e => setForm({...form, precioFilamento: e.target.value})} disabled={calculoFinalizado} /></div>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-4"><input type="number" step="0.01" className="form-control bg-dark text-white border-secondary" placeholder="Gramos" required value={form.pesoTotal} onChange={e => setForm({...form, pesoTotal: e.target.value})} disabled={calculoFinalizado} /></div>
                    <div className="col-4"><input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Horas" required value={form.tiempoHoras} onChange={e => setForm({...form, tiempoHoras: e.target.value})} disabled={calculoFinalizado} /></div>
                    <div className="col-4"><input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Minutos" required value={form.tiempoMinutos} onChange={e => setForm({...form, tiempoMinutos: e.target.value})} disabled={calculoFinalizado} /></div>
                  </div>
                  <div className="row g-2 mb-2 align-items-center">
                    <div className="col-6"><div className="form-check"><input className="form-check-input" type="checkbox" id="chkSecado" checked={form.usaSecado} onChange={e => setForm({...form, usaSecado: e.target.checked})} disabled={calculoFinalizado} /><label className="form-check-label small text-white" htmlFor="chkSecado">Secado (+200W ACE)</label></div></div>
                    <div className="col-6"><div className="input-group input-group-sm"><span className="input-group-text bg-dark text-warning border-secondary">Desc.</span><input type="number" className="form-control bg-dark text-white border-secondary" placeholder="%" value={form.descuento} onChange={e => setForm({...form, descuento: e.target.value})} disabled={calculoFinalizado} /></div></div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6"><div className="input-group input-group-sm"><span className="input-group-text bg-dark text-white border-secondary">Extra $</span><input type="number" className="form-control bg-dark text-white border-secondary" value={form.insumosExternos} onChange={e => setForm({...form, insumosExternos: e.target.value})} disabled={calculoFinalizado} /></div></div>
                    <div className="col-6"><div className="input-group input-group-sm"><span className="input-group-text bg-dark text-white border-secondary">M. Obra $</span><input type="number" className="form-control bg-dark text-white border-secondary" value={form.manoObra} onChange={e => setForm({...form, manoObra: e.target.value})} disabled={calculoFinalizado} /></div></div>
                  </div>

                  {/* AUTOGESTIÓN */}
                  <div className="card mb-3" style={{ backgroundColor: '#0b0e14', border: '1px solid #00d4ff' }}>
                    <div className="card-header py-1 fw-bold" style={{ borderBottom: form.publicarCatalogo ? '1px solid #00d4ff' : 'none' }}>
                      <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" id="switchCatalogo" 
                          checked={form.publicarCatalogo} onChange={e => setForm({...form, publicarCatalogo: e.target.checked})} disabled={calculoFinalizado} />
                        <label className="form-check-label small mt-1 text-white" htmlFor="switchCatalogo">
                          <span style={{ color: '#00d4ff' }}>🟢</span> PUBLICAR EN CATÁLOGO PÚBLICO
                        </label>
                      </div>
                    </div>
                    
                    {form.publicarCatalogo && (
                      <div className="card-body p-2 animate__animated animate__fadeIn">
                        <div className="mb-2"><input type="text" className="form-control form-control-sm bg-dark text-white border-secondary" placeholder="URL de la Foto (Ej: https://...)" value={form.imagenUrl} onChange={e => setForm({...form, imagenUrl: e.target.value})} disabled={calculoFinalizado} /></div>
                        <div className="mb-2"><textarea className="form-control form-control-sm bg-dark text-white border-secondary" placeholder="Descripción comercial (Ej: Chop impreso con acabado Silk...)" rows="2" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} disabled={calculoFinalizado}></textarea></div>
                        <div><input type="text" className="form-control form-control-sm bg-dark text-white border-secondary" placeholder="Tiempo de espera (Ej: 48hs a 72hs)" value={form.tiempoEspera} onChange={e => setForm({...form, tiempoEspera: e.target.value})} disabled={calculoFinalizado} /></div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    {calculoFinalizado ? (
                      <button type="button" className="btn w-100 fw-bold" style={{ backgroundColor: '#00d4ff', color: '#0b0e14' }} onClick={iniciarNuevoCalculo}>NUEVO CÁLCULO</button>
                    ) : (
                      <>
                        <button type="submit" className="btn w-100 fw-bold border-info text-info" style={{ backgroundColor: 'transparent' }}>{editandoId ? 'ACTUALIZAR PROYECTO' : 'GUARDAR CÁLCULO'}</button>
                        {editandoId && <button type="button" className="btn btn-secondary" onClick={cancelarEdicion}>Cancelar</button>}
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
            {ultimoResultado && ( <div className="card border-info shadow" style={{ backgroundColor: '#151921' }}><div className="card-body text-center"><h5 className="text-info fw-bold">{ultimoResultado.nombre}</h5><span className="h4 fw-bold" style={{ color: '#00ff88' }}>{formatoMoneda(ultimoResultado.precioVenta)}</span></div></div> )}
          </div>

          {/* PANEL HISTORIAL */}
          <div className="col-lg-4 col-md-4">
            <ListaProyectos proyectos={proyectos} eliminarProyecto={eliminarProyecto} limpiarTodo={limpiarTodo} cargarParaEditar={cargarParaEditar} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-public py-4 mt-auto">
        <div className="container text-center">
          <div className="brand-text mb-3 d-inline-flex">
            <span style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '12pt' }}>PIXELCRAFT 3D</span>
          </div>
          <p className="text-muted small mb-3">San Salvador de Jujuy, Argentina - {new Date().getFullYear()}</p>
          
          <div className="social-icons d-flex justify-content-center gap-4">
            <a href="#" className="social-icon" title="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"/></svg></a>
            <a href="#" className="social-icon" title="Instagram"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.036 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/></svg></a>
            <a href="#" className="social-icon" title="TikTok"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/></svg></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AdminPanel;