import React, { useState, useEffect } from 'react';
import { calcularPresupuestoFinal } from '../utils/calculos';
import ListaProyectos from '../components/ListaProyectos';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom'; 

function AdminPanel() {
  // === SISTEMA DE LOGIN CON MEMORIA DE SESIÓN ===
  const [isLogged, setIsLogged] = useState(() => {
    // Verifica si ya había iniciado sesión en esta pestaña
    return sessionStorage.getItem('pixelcraft_admin_logged') === 'true';
  });
  const [credenciales, setCredenciales] = useState({ usuario: '', password: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (credenciales.usuario === 'pixel' && credenciales.password === 'pixel') {
      setIsLogged(true);
      // Guarda la sesión en el navegador
      sessionStorage.setItem('pixelcraft_admin_logged', 'true');
    } else {
      alert("Credenciales incorrectas. Intenta de nuevo.");
    }
  };

  const handleLogout = () => {
    setIsLogged(false);
    // Borra la sesión al salir
    sessionStorage.removeItem('pixelcraft_admin_logged');
  };

  // === ESTADOS DE LA CALCULADORA ===
  const [config, setConfig] = useState({
    kwh: 120, margen: 50, valorMaquina: 1200000, mantenimientoHora: 500
  });

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
    if (!isLogged) return;

    const unsubConfig = onSnapshot(doc(db, "configuracion", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      }
    });

    const qProyectos = query(collection(db, "calculos"), orderBy("id", "desc"));
    const unsubProyectos = onSnapshot(qProyectos, (snapshot) => {
      setProyectos(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });

    const qVentas = query(collection(db, "ventas"), orderBy("id", "desc"));
    const unsubVentas = onSnapshot(qVentas, (snapshot) => {
      setVentas(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
    });

    return () => { unsubProyectos(); unsubVentas(); unsubConfig(); };
  }, [isLogged]);

  const guardarAjustesGlobales = async () => {
    try {
      await setDoc(doc(db, "configuracion", "global"), {
        kwh: parseFloat(config.kwh) || 0,
        margen: parseFloat(config.margen) || 0,
        valorMaquina: parseFloat(config.valorMaquina) || 0,
        mantenimientoHora: parseFloat(config.mantenimientoHora) || 0
      });
      alert("✅ Ajustes Globales actualizados para todos los dispositivos.");
    } catch (error) {
      console.error("Error guardando ajustes:", error);
      alert("Error al guardar ajustes en la nube.");
    }
  };

  const cargarParaEditar = (proyecto) => {
    setEditandoId(proyecto.firestoreId);
    setCalculoFinalizado(false);
    const horasTotales = proyecto.tiempoTotal || proyecto.horas || 0;
    
    setForm({
      nombreProyecto: proyecto.nombre || "", material: proyecto.material || "PLA/PETG",
      pesoTotal: proyecto.pesoTotal || proyecto.peso || "", precioFilamento: proyecto.precioFilamento || "", 
      tiempoHoras: Math.floor(horasTotales), tiempoMinutos: Math.round((horasTotales % 1) * 60), 
      usaSecado: proyecto.secado || false, descuento: proyecto.descuento || "",
      insumosExternos: proyecto.insumosExternos || "", manoObra: proyecto.manoObra || "",
      publicarCatalogo: proyecto.publicarCatalogo || false, descripcion: proyecto.descripcion || "",
      imagenUrl: proyecto.imagenUrl || "", tiempoEspera: proyecto.tiempoEspera || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoId(null); setCalculoFinalizado(false);
    setForm({ nombreProyecto: "", material: "PLA/PETG", pesoTotal: "", precioFilamento: "", tiempoHoras: "", tiempoMinutos: "", usaSecado: false, descuento: "", insumosExternos: "", manoObra: "", publicarCatalogo: false, descripcion: "", imagenUrl: "", tiempoEspera: "" });
    setUltimoResultado(null);
  };

  const iniciarNuevoCalculo = () => {
    setCalculoFinalizado(false); setUltimoResultado(null); setEditandoId(null);
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
        setEditandoId(null); setCalculoFinalizado(false); cancelarEdicion();
      } else {
        datosAGuardar.id = Date.now(); 
        await addDoc(collection(db, "calculos"), datosAGuardar);
        setCalculoFinalizado(true); 
      }
      setUltimoResultado(datosAGuardar);
    } catch (error) { alert("Error al guardar."); }
  };

  const eliminarProyecto = async (idFirestore) => { if (confirm("¿Borrar este proyecto?")) { await deleteDoc(doc(db, "calculos", idFirestore)); if (editandoId === idFirestore) cancelarEdicion(); } };
  const limpiarTodo = async () => { if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará todo el historial.")) { proyectos.forEach(async (p) => await deleteDoc(doc(db, "calculos", p.firestoreId))); cancelarEdicion(); } };
  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  if (!isLogged) {
    return (
      <div className="container-fluid d-flex flex-column min-vh-100 p-0" style={{ backgroundColor: '#0b0e14' }}>
        <nav className="navbar-public">
          <div className="brand"><div className="pixel-logo">P</div><div className="brand-text"><span>PIXEL</span><span>CRAFT</span></div></div>
          <Link to="/" className="btn-login text-decoration-none">VOLVER AL CATÁLOGO</Link>
        </nav>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="card shadow-lg border-info" style={{ width: '350px', backgroundColor: '#151921' }}>
            <div className="card-header bg-dark border-info text-center"><h4 style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '10pt', margin: '15px 0' }}>PIXELCRAFT ADMIN</h4></div>
            <div className="card-body">
              <form onSubmit={handleLogin}>
                <div className="mb-3"><label className="text-white small">Usuario</label><input type="text" className="form-control bg-dark text-white border-secondary" value={credenciales.usuario} onChange={(e) => setCredenciales({...credenciales, usuario: e.target.value})} required/></div>
                <div className="mb-4"><label className="text-white small">Contraseña</label><input type="password" className="form-control bg-dark text-white border-secondary" value={credenciales.password} onChange={(e) => setCredenciales({...credenciales, password: e.target.value})} required/></div>
                <button type="submit" className="btn w-100 fw-bold text-dark" style={{ backgroundColor: '#00d4ff' }}>INGRESAR</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#0b0e14' }}>
      <nav className="navbar-public">
        <div className="brand"><div className="pixel-logo">P</div><div className="brand-text"><span>PIXEL</span><span>CRAFT</span></div></div>
        <div className="nav-links d-none d-md-flex align-items-center"><Link to="/" className="nav-link text-decoration-none">Ver Catálogo Público</Link></div>
        {/* Llama a handleLogout en lugar de solo cambiar el estado */}
        <button onClick={handleLogout} className="btn-login" style={{ borderColor: '#ff4444', color: '#ff4444' }}>CERRAR SESIÓN</button>
      </nav>

      <div className="container-fluid py-4 flex-grow-1">
        <h1 className="text-center fw-bold mb-4" style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0,212,255,0.6)', fontFamily: "'Press Start 2P', monospace", fontSize: '20px' }}>
          PIXELCRAFT 3D CLOUD
        </h1>

        <div className="row g-3">
          {/* PANEL DE CONFIGURACIÓN GLOBAL */}
          <div className="col-lg-2 col-md-3">
              <div className="card shadow-sm border-warning" style={{ backgroundColor: '#151921' }}>
                <div className="card-header bg-warning text-dark fw-bold small text-center">AJUSTES GLOBALES (NUBE)</div>
                <div className="card-body p-2">
                  <div className="mb-2"><label className="small fw-bold text-white">Tarifa KWh</label><input type="number" step="0.01" className="form-control form-control-sm bg-dark text-warning border-secondary fw-bold" value={config.kwh} onChange={e => setConfig({...config, kwh: e.target.value})} /></div>
                  <div className="mb-2"><label className="small fw-bold text-white">Máquina ($)</label><input type="number" className="form-control form-control-sm bg-dark text-warning border-secondary fw-bold" value={config.valorMaquina} onChange={e => setConfig({...config, valorMaquina: e.target.value})} /></div>
                  <div className="mb-2"><label className="small fw-bold text-white">Desgaste ($/h)</label><input type="number" className="form-control form-control-sm bg-dark text-warning border-secondary fw-bold" value={config.mantenimientoHora} onChange={e => setConfig({...config, mantenimientoHora: e.target.value})} /></div>
                  <div className="mb-3"><label className="small fw-bold text-white">Margen %</label><input type="number" className="form-control form-control-sm bg-dark text-warning border-secondary fw-bold" value={config.margen} onChange={e => setConfig({...config, margen: e.target.value})} /></div>
                  <button onClick={guardarAjustesGlobales} className="btn btn-sm w-100 fw-bold" style={{ backgroundColor: '#00d4ff', color: '#0b0e14' }}>
                    💾 GUARDAR EN LA NUBE
                  </button>
                </div>
              </div>
          </div>

          {/* PANEL CALCULADORA */}
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

                  <div className="card mb-3" style={{ backgroundColor: '#0b0e14', border: '1px solid #00d4ff' }}>
                    <div className="card-header py-1 fw-bold" style={{ borderBottom: form.publicarCatalogo ? '1px solid #00d4ff' : 'none' }}>
                      <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" id="switchCatalogo" checked={form.publicarCatalogo} onChange={e => setForm({...form, publicarCatalogo: e.target.checked})} disabled={calculoFinalizado} />
                        <label className="form-check-label small mt-1 text-white" htmlFor="switchCatalogo"><span style={{ color: '#00d4ff' }}>🟢</span> PUBLICAR EN CATÁLOGO PÚBLICO</label>
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

      <footer className="footer-public py-4 mt-auto">
        <div className="container text-center">
          <div className="brand-text mb-3 d-inline-flex"><span style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '12pt' }}>PIXELCRAFT 3D</span></div>
          <p className="text-muted small mb-3">San Salvador de Jujuy, Argentina - {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default AdminPanel;