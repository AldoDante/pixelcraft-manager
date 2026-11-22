import React, { useState, useEffect } from 'react';
import { calcularPresupuestoFinal } from '../utils/calculos';
import ListaProyectos from '../components/ListaProyectos';
import ModuloVentas from '../components/ModuloVentas';
import AjustesGlobales from '../components/AjustesGlobales';
import CalculadoraForm from '../components/CalculadoraForm';
import ChatAsistenteIA from '../components/ChatAsistenteIA';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';

const AI_ASSISTANT_URL = import.meta.env.VITE_AI_ASSISTANT_URL || 'https://aldo-dante.tail97f23e.ts.net/';

const NOMBRES_SOCIOS = {
  'dante.acuario79@gmail.com': 'Aldo Dante Antivilo',
  'japodeck@gmail.com': 'Alejandro Ruiz',
};

const MEDIOS_PAGO_DEFECTO = ['Efectivo', 'Transferencia'];

function AdminPanel() {
  // === SISTEMA DE LOGIN SEGURO CON FIREBASE AUTH ===
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [credenciales, setCredenciales] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const isLogged = Boolean(user);
  const nombreEmisor =
    NOMBRES_SOCIOS[user?.email?.toLowerCase()] || user?.displayName || user?.email || 'PixelCraft 3D';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, credenciales.email.trim(), credenciales.password);
      setCredenciales({ email: '', password: '' });
    } catch (error) {
      console.error("Error de autenticación:", error.code);
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-email'
      ) {
        setLoginError('Correo o contraseña incorrectos.');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Falta activar "Correo electrónico/contraseña" en Firebase Authentication.');
      } else {
        setLoginError('No se pudo iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('pixelcraft_admin_logged');
  };

  // === CONTROL DE PESTAÑAS (TABS) Y CHAT IA ===
  const [tabActiva, setTabActiva] = useState('calculadora');
  const [chatAbierto, setChatAbierto] = useState(false);

  // === ESTADOS DE CONFIGURACIÓN GLOBAL ===
  const [config, setConfig] = useState({
    kwh: 425,
    margen: 100,
    impresoras: {}
  });

  const [proyectos, setProyectos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [calculoFinalizado, setCalculoFinalizado] = useState(false);

  // === FORMULARIO DE COTIZACIÓN ===
  const [form, setForm] = useState({
    clienteNombre: "",
    clienteDireccion: "",
    mediosPago: [...MEDIOS_PAGO_DEFECTO],
    nombreProyecto: "",
    impresoraId: "kobra-combo",
    material: "PLA/PETG",
    pesoTotal: "",
    precioFilamento: "",
    tiempoHoras: "",
    tiempoMinutos: "",
    usaSecado: false,
    margenGanancia: 100,
    descuento: "",
    insumosExternos: "",
    detalleExtras: "",
    manoObra: "",
    publicarCatalogo: false,
    descripcion: "",
    imagenUrl: "",
    tiempoEspera: ""
  });

  useEffect(() => {
    if (!isLogged) return;

    const unsubConfig = onSnapshot(doc(db, "configuracion", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(prev => ({ ...prev, ...docSnap.data() }));
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
        kwh: parseFloat(config.kwh) || 425,
        margen: parseFloat(config.margen) || 100,
        impresoras: config.impresoras || {}
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
      clienteNombre: proyecto.clienteNombre || "",
      clienteDireccion: proyecto.clienteDireccion || "",
      mediosPago: Array.isArray(proyecto.mediosPago) ? proyecto.mediosPago : [...MEDIOS_PAGO_DEFECTO],
      nombreProyecto: proyecto.nombre || "",
      impresoraId: proyecto.impresoraId || "kobra-combo",
      material: proyecto.material || "PLA/PETG",
      pesoTotal: proyecto.pesoTotal || proyecto.peso || "",
      precioFilamento: proyecto.precioFilamento || "",
      tiempoHoras: Math.floor(horasTotales),
      tiempoMinutos: Math.round((horasTotales % 1) * 60),
      usaSecado: proyecto.secado || false,
      margenGanancia: proyecto.margenUsado !== undefined ? proyecto.margenUsado : (config.margen || 100),
      descuento: proyecto.descuento || "",
      insumosExternos: proyecto.insumosExternos || proyecto.detalle?.extras || "",
      detalleExtras: proyecto.detalleExtras || proyecto.detalle?.notaExtras || "",
      manoObra: proyecto.manoObra || proyecto.detalle?.manoObra || "",
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
    setForm({
      clienteNombre: "",
      clienteDireccion: "",
      mediosPago: [...MEDIOS_PAGO_DEFECTO],
      nombreProyecto: "",
      impresoraId: "kobra-combo",
      material: "PLA/PETG",
      pesoTotal: "",
      precioFilamento: "",
      tiempoHoras: "",
      tiempoMinutos: "",
      usaSecado: false,
      margenGanancia: config.margen || 100,
      descuento: "",
      insumosExternos: "",
      detalleExtras: "",
      manoObra: "",
      publicarCatalogo: false,
      descripcion: "",
      imagenUrl: "",
      tiempoEspera: ""
    });
    setUltimoResultado(null);
  };

  const iniciarNuevoCalculo = () => {
    setCalculoFinalizado(false);
    setUltimoResultado(null);
    setEditandoId(null);
    setForm(prev => ({
      ...prev,
      clienteNombre: "",
      clienteDireccion: "",
      nombreProyecto: "",
      pesoTotal: "",
      tiempoHoras: "",
      tiempoMinutos: "",
      descuento: "",
      insumosExternos: "",
      detalleExtras: "",
      manoObra: "",
      publicarCatalogo: false,
      descripcion: "",
      imagenUrl: "",
      tiempoEspera: ""
    }));
  };

  const handleCalcular = async (e) => {
    e.preventDefault();
    if (!form.nombreProyecto || form.pesoTotal === "" || form.tiempoHoras === "") {
      alert("Por favor completa al menos el nombre, los gramos y las horas.");
      return;
    }

    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);

    const impConfig = config.impresoras?.[form.impresoraId] || {};

    const resultadoCalculo = calcularPresupuestoFinal({
      ...form,
      tiempoTotal: tiempoDecimal,
      costoKWh: config.kwh,
      margenGanancia: form.margenGanancia || config.margen,
      precioFilamento: form.precioFilamento,
      valorMaquina: impConfig.valorMaquina,
      vidaUtilHoras: impConfig.vidaUtilHoras,
      costoService500h: impConfig.costoService500h
    });

    const datosAGuardar = {
      clienteNombre: form.clienteNombre || "",
      clienteDireccion: form.clienteDireccion || "",
      mediosPago: Array.isArray(form.mediosPago) ? form.mediosPago : [],
      creadoPor: nombreEmisor,
      nombre: form.nombreProyecto,
      impresoraId: form.impresoraId,
      impresoraNombre: resultadoCalculo.impresoraNombre,
      pesoTotal: form.pesoTotal,
      precioFilamento: form.precioFilamento,
      horas: tiempoDecimal,
      tiempoTotal: tiempoDecimal,
      material: form.material,
      secado: form.usaSecado,
      descuento: form.descuento,
      insumosExternos: form.insumosExternos,
      detalleExtras: form.detalleExtras,
      manoObra: form.manoObra,
      costoProduccion: resultadoCalculo.costoProduccion,
      precioVenta: resultadoCalculo.precioVenta,
      precioOriginal: resultadoCalculo.precioOriginal,
      montoDescuento: resultadoCalculo.montoDescuento,
      margenUsado: resultadoCalculo.margenUsado,
      detalle: resultadoCalculo.detalle,
      publicarCatalogo: form.publicarCatalogo,
      descripcion: form.descripcion,
      imagenUrl: form.imagenUrl,
      tiempoEspera: form.tiempoEspera
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
      console.error(error);
      alert("Error al guardar en Firestore.");
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

  if (authLoading) {
    return (
      <div className="container-fluid d-flex flex-column justify-content-center align-items-center min-vh-100" style={{ backgroundColor: '#0b0e14', color: '#00d4ff' }}>
        <div className="spinner-border text-info mb-3" role="status" />
        <p className="small text-secondary mb-0">Verificando sesión...</p>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="container-fluid d-flex flex-column min-vh-100 p-0" style={{ backgroundColor: '#0b0e14' }}>
        <nav className="navbar-public">
          <div className="brand">
            <div className="pixel-logo">P</div>
            <div className="brand-text"><span>PIXEL</span><span>CRAFT</span></div>
          </div>
          <Link to="/" className="btn-login text-decoration-none">VOLVER AL CATÁLOGO</Link>
        </nav>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center p-3">
          <div className="card shadow-lg border-info" style={{ width: '360px', maxWidth: '100%', backgroundColor: '#151921' }}>
            <div className="card-header bg-dark border-info text-center">
              <h4 style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '10pt', margin: '15px 0' }}>
                PIXELCRAFT ADMIN
              </h4>
            </div>
            <div className="card-body">
              {loginError && (
                <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                  {loginError}
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="text-white small">Correo electrónico</label>
                  <input 
                    type="email" 
                    className="form-control bg-dark text-white border-secondary" 
                    placeholder="socio@gmail.com"
                    autoComplete="email"
                    value={credenciales.email} 
                    onChange={(e) => setCredenciales({ ...credenciales, email: e.target.value })} 
                    required 
                  />
                </div>
                <div className="mb-4">
                  <label className="text-white small">Contraseña</label>
                  <input 
                    type="password" 
                    className="form-control bg-dark text-white border-secondary" 
                    autoComplete="current-password"
                    value={credenciales.password} 
                    onChange={(e) => setCredenciales({ ...credenciales, password: e.target.value })} 
                    required 
                  />
                </div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="btn w-100 fw-bold text-dark"
                  style={{ backgroundColor: '#00d4ff' }}
                >
                  {loggingIn ? 'VERIFICANDO...' : 'INGRESAR'}
                </button>
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
        <div className="brand">
          <div className="pixel-logo">P</div>
          <div className="brand-text"><span>PIXEL</span><span>CRAFT</span></div>
        </div>
        <div className="nav-links d-none d-md-flex align-items-center gap-3">
          <Link to="/" className="nav-link text-decoration-none">Ver Catálogo Público</Link>
          {user?.email && (
            <span className="small text-secondary" style={{ fontSize: '0.8rem' }}>
              {user.email}
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="btn-login" style={{ borderColor: '#ff4444', color: '#ff4444' }}>
          CERRAR SESIÓN
        </button>
      </nav>

      <div className="container-fluid py-4 flex-grow-1">
        <h1 
          className="text-center fw-bold mb-3" 
          style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.4)', fontFamily: "'Orbitron', sans-serif", letterSpacing: '2px', fontSize: '1.45rem' }}
        >
          PIXELCRAFT 3D CLOUD
        </h1>

        {/* SELECTOR DE PESTAÑAS */}
        <div className="d-flex justify-content-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            className="btn fw-bold px-4 py-2"
            style={{
              backgroundColor: tabActiva === 'calculadora' ? '#00d4ff' : '#151921',
              color: tabActiva === 'calculadora' ? '#0b0e14' : '#fff',
              border: '1px solid #00d4ff',
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              boxShadow: tabActiva === 'calculadora' ? '0 0 10px rgba(0,212,255,0.4)' : 'none'
            }}
            onClick={() => setTabActiva('calculadora')}
          >
            🖨️ CALCULADORA Y PROYECTOS
          </button>
          <button
            type="button"
            className="btn fw-bold px-4 py-2 position-relative"
            style={{
              backgroundColor: tabActiva === 'ventas' ? '#00d4ff' : '#151921',
              color: tabActiva === 'ventas' ? '#0b0e14' : '#fff',
              border: '1px solid #00d4ff',
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              boxShadow: tabActiva === 'ventas' ? '0 0 10px rgba(0,212,255,0.4)' : 'none'
            }}
            onClick={() => setTabActiva('ventas')}
          >
            📊 VENTAS Y REPARTO DE SOCIOS
            {ventas.length > 0 && (
              <span className="badge bg-danger rounded-pill ms-2" style={{ fontSize: '0.7rem' }}>
                {ventas.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className="btn fw-bold px-4 py-2"
            style={{
              backgroundColor: chatAbierto ? '#a855f7' : '#151921',
              color: chatAbierto ? '#fff' : '#c084fc',
              border: '1px solid #a855f7',
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              boxShadow: '0 0 10px rgba(168,85,247,0.3)'
            }}
            onClick={() => setChatAbierto((prev) => !prev)}
          >
            🤖 ASISTENTE IA
          </button>
        </div>

        {tabActiva === 'calculadora' ? (
          <div className="row g-3">
            {/* 1. MÓDULO DE AJUSTES GLOBALES (NUBE) */}
            <div className="col-lg-3 col-md-4">
              <AjustesGlobales 
                config={config} 
                setConfig={setConfig} 
                guardarAjustesGlobales={guardarAjustesGlobales} 
              />
            </div>

            {/* 2. FORMULARIO DE COTIZACIÓN */}
            <div className="col-lg-5 col-md-8">
              <CalculadoraForm 
                form={form}
                setForm={setForm}
                handleCalcular={handleCalcular}
                editandoId={editandoId}
                calculoFinalizado={calculoFinalizado}
                iniciarNuevoCalculo={iniciarNuevoCalculo}
                cancelarEdicion={cancelarEdicion}
                ultimoResultado={ultimoResultado}
                config={config}
              />
            </div>

            {/* 3. HISTORIAL DE TRABAJOS */}
            <div className="col-lg-4 col-md-12">
              <ListaProyectos 
                proyectos={proyectos} 
                eliminarProyecto={eliminarProyecto} 
                limpiarTodo={limpiarTodo} 
                cargarParaEditar={cargarParaEditar}
                irAVentas={() => setTabActiva('ventas')}
              />
            </div>
          </div>
        ) : (
          <ModuloVentas ventas={ventas} proyectos={proyectos} />
        )}
      </div>

      <ChatAsistenteIA
        abierto={chatAbierto}
        setAbierto={setChatAbierto}
        form={form}
        ultimoResultado={ultimoResultado}
        config={config}
        proyectos={proyectos}
        ventas={ventas}
        aiWebUrl={AI_ASSISTANT_URL}
        nombreEmisor={nombreEmisor}
      />

      <footer className="footer-public py-4 mt-auto">
        <div className="container text-center">
          <div className="brand-text mb-3 d-inline-flex">
            <span style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '12pt' }}>
              PIXELCRAFT 3D
            </span>
          </div>
          <p className="text-muted small mb-3">San Salvador de Jujuy, Argentina - {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default AdminPanel;
