import React, { useState, useEffect, useRef } from 'react';
import { calcularPresupuestoFinal } from '../utils/calculos';
import { construirItemCatalogoPublico } from '../utils/catalogoPublico';
import { mapearCarteleriaAFormulario } from '../utils/carteleriaBridge';
import ListaProyectos from '../components/ListaProyectos';
import ModuloVentas from '../components/ModuloVentas';
import AjustesGlobales from '../components/AjustesGlobales';
import CalculadoraForm from '../components/CalculadoraForm';
import ChatAsistenteIA from '../components/ChatAsistenteIA';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
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

  // Puente en tiempo real desde el iframe de PixelCraft LED Studio (/studio/) -> CalculadoraForm
  useEffect(() => {
    if (!isLogged) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'PIXELCRAFT_STUDIO_TO_MANAGER') return;

      const campos = mapearCarteleriaAFormulario({
        nombreProyecto: data.nombreProyecto,
        structureCode: data.structureCode,
        metrics: data.metrics,
        precios: data.precios || {},
      });
      if (!campos) return;

      setEditandoId(null);
      setCalculoFinalizado(false);
      setUltimoResultado(null);
      setForm((prev) => ({
        ...prev,
        ...campos,
        insumosExternos: campos.insumosExternos !== '' ? campos.insumosExternos : prev.insumosExternos,
      }));
      setTabActiva('calculadora');
      setAvisoStudio(
        `✅ Datos importados desde PixelCraft LED Studio: ${campos.nombreProyecto} (${campos.pesoTotal} g · ${campos.tiempoHoras}h ${campos.tiempoMinutos}m)`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setAvisoStudio(''), 7000);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isLogged]);

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

  // === CONTROL DE PESTAÑAS (TABS), VENTA RÁPIDA, STUDIO 3D, MENÚ USUARIO Y CHAT IA ===
  const [tabActiva, setTabActiva] = useState('calculadora');
  const [studioCargado, setStudioCargado] = useState(false);
  const [avisoStudio, setAvisoStudio] = useState('');
  const [ventaInicial, setVentaInicial] = useState(null);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const catalogoMigradoRef = useRef(false);

  // Cerrar menú de usuario al hacer clic afuera o presionar Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [userMenuOpen]);

  // === ESTADOS DE CONFIGURACIÓN GLOBAL ===
  const [config, setConfig] = useState({
    kwh: 425,
    margen: 100,
    impresoras: {}
  });

  const [proyectos, setProyectos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [calculoFinalizado, setCalculoFinalizado] = useState(false);

  // === FORMULARIO DE COTIZACIÓN ===
  const [form, setForm] = useState({
    tipoProyecto: "impresion_3d",
    datosCarteleria: null,
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

    const qGastos = query(collection(db, "gastos"), orderBy("id", "desc"));
    const unsubGastos = onSnapshot(
      qGastos,
      (snapshot) => {
        setGastos(snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Error escuchando colección gastos:", error);
      }
    );

    return () => { unsubProyectos(); unsubVentas(); unsubGastos(); unsubConfig(); };
  }, [isLogged]);

  // Migración automática única: sincroniza hacia `catalogo_publico` cualquier proyecto ya publicado
  useEffect(() => {
    if (!isLogged || catalogoMigradoRef.current || proyectos.length === 0) return;
    const publicados = proyectos.filter((p) => p.publicarCatalogo);
    if (publicados.length === 0) return;

    catalogoMigradoRef.current = true;
    (async () => {
      try {
        const snapPublico = await getDocs(collection(db, "catalogo_publico"));
        const idsExistentes = new Set(snapPublico.docs.map((d) => d.id));
        const faltantes = publicados.filter((p) => !idsExistentes.has(p.firestoreId));
        if (faltantes.length === 0) return;

        const batch = writeBatch(db);
        faltantes.forEach((p) => {
          batch.set(
            doc(db, "catalogo_publico", p.firestoreId),
            construirItemCatalogoPublico(p.firestoreId, p)
          );
        });
        await batch.commit();
      } catch (error) {
        console.error("Error sincronizando catálogo público:", error);
        catalogoMigradoRef.current = false;
      }
    })();
  }, [isLogged, proyectos]);

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

    const formCargado = {
      tipoProyecto: proyecto.tipoProyecto || "impresion_3d",
      datosCarteleria: proyecto.datosCarteleria || null,
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
    };
    setForm(formCargado);

    const impConfig = config.impresoras?.[formCargado.impresoraId] || {};
    const resultadoCargado = calcularPresupuestoFinal({
      ...formCargado,
      tiempoTotal: horasTotales,
      costoKWh: config.kwh,
      margenGanancia: formCargado.margenGanancia,
      precioFilamento: formCargado.precioFilamento,
      valorMaquina: impConfig.valorMaquina,
      vidaUtilHoras: impConfig.vidaUtilHoras,
      costoService500h: impConfig.costoService500h
    });
    setUltimoResultado(resultadoCargado);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setCalculoFinalizado(false);
    setForm({
      tipoProyecto: "impresion_3d",
      datosCarteleria: null,
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
      tipoProyecto: "impresion_3d",
      datosCarteleria: null,
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

  const sincronizarCatalogoPublico = async (calculoId, datos) => {
    const refPublico = doc(db, "catalogo_publico", calculoId);
    if (datos.publicarCatalogo) {
      await setDoc(refPublico, construirItemCatalogoPublico(calculoId, datos));
    } else {
      await deleteDoc(refPublico).catch(() => {});
    }
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
      tipoProyecto: form.tipoProyecto || "impresion_3d",
      datosCarteleria: form.datosCarteleria || null,
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
        const idActual = editandoId;
        await updateDoc(doc(db, "calculos", idActual), datosAGuardar);
        await sincronizarCatalogoPublico(idActual, datosAGuardar);
        cancelarEdicion();
      } else {
        datosAGuardar.id = Date.now();
        const docRef = await addDoc(collection(db, "calculos"), datosAGuardar);
        await sincronizarCatalogoPublico(docRef.id, datosAGuardar);
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
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "calculos", idFirestore));
        batch.delete(doc(db, "catalogo_publico", idFirestore));
        await batch.commit();
        if (editandoId === idFirestore) cancelarEdicion();
      } catch (error) {
        console.error("Error al eliminar proyecto:", error);
        alert("No se pudo eliminar el proyecto.");
      }
    }
  };

  const limpiarTodo = async () => {
    if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará todo el historial y los productos publicados en el catálogo.")) {
      try {
        // Firestore permite hasta 500 operaciones por batch (2 ops por proyecto -> bloques de 200)
        for (let i = 0; i < proyectos.length; i += 200) {
          const batch = writeBatch(db);
          proyectos.slice(i, i + 200).forEach((p) => {
            batch.delete(doc(db, "calculos", p.firestoreId));
            batch.delete(doc(db, "catalogo_publico", p.firestoreId));
          });
          await batch.commit();
        }
        cancelarEdicion();
      } catch (error) {
        console.error("Error limpiando historial:", error);
        alert("No se pudo borrar el historial completo.");
      }
    }
  };

  const abrirVentaParaProyecto = (proyecto) => {
    setVentaInicial({ proyecto, nonce: Date.now() });
    setTabActiva('ventas');
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

  const inicialUsuario = (nombreEmisor || user?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#0b0e14' }}>
      <nav className="navbar-public navbar-admin">
        <div
          className="brand"
          style={{ cursor: 'pointer' }}
          onClick={() => setTabActiva('calculadora')}
          title="Ir a Calculadora y Proyectos"
        >
          <div className="pixel-logo">P</div>
          <div className="brand-text"><span>PIXEL</span><span>CRAFT</span></div>
        </div>

        {/* NAVEGACIÓN PRINCIPAL EN BARRA SUPERIOR */}
        <div className="admin-nav-tabs" role="navigation" aria-label="Navegación principal">
          <button
            type="button"
            className={`admin-nav-btn ${tabActiva === 'calculadora' ? 'active-cyan' : ''}`}
            onClick={() => setTabActiva('calculadora')}
            title="PixelCraft Cost Lab — Calculadora de Costos y Presupuestos 3D"
          >
            <span>🧮</span>
            <span>Cost Lab</span>
          </button>

          <button
            type="button"
            className={`admin-nav-btn finance-tab ${tabActiva === 'ventas' ? 'active-amber' : ''}`}
            onClick={() => setTabActiva('ventas')}
            title="PixelCraft Finance — Ventas, Gastos y Balance del Taller"
          >
            <span>📊</span>
            <span>Finance</span>
            {(ventas.length + gastos.length) > 0 && (
              <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.68rem' }}>
                {ventas.length + gastos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-btn studio-tab ${tabActiva === 'studio' ? 'active-green' : ''}`}
            onClick={() => {
              setStudioCargado(true);
              setTabActiva('studio');
            }}
            title="PixelCraft LED Studio — Generador 3D de Carteles Corpóreos LED"
          >
            <span>💡</span>
            <span>LED Studio</span>
          </button>

          <button
            type="button"
            className={`admin-nav-btn ai-tab ${chatAbierto ? 'active-purple' : ''}`}
            onClick={() => setChatAbierto((prev) => !prev)}
          >
            <span>🤖</span>
            <span>Asistente IA</span>
          </button>

          <Link to="/" className="admin-nav-btn text-decoration-none">
            <span>🛒</span>
            <span>Ver Catálogo</span>
          </Link>
        </div>

        {/* MENÚ DE USUARIO DESPLEGABLE A LA DERECHA (LISTO PARA FUTURO PERFIL) */}
        <div className="admin-user-menu" ref={userMenuRef}>
          <button
            type="button"
            className={`admin-user-trigger ${userMenuOpen ? 'open' : ''}`}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((prev) => !prev)}
          >
            <span className="admin-user-avatar">{inicialUsuario}</span>
            <span className="admin-user-trigger-text">{user?.email || nombreEmisor}</span>
            <span className="admin-user-caret">{userMenuOpen ? '▴' : '▾'}</span>
          </button>

          {userMenuOpen && (
            <div className="admin-user-dropdown" role="menu">
              <div className="admin-user-header">
                <div className="admin-user-name">{nombreEmisor}</div>
                {user?.email && <div className="admin-user-email">{user.email}</div>}
              </div>

              <div className="admin-user-divider" />

              <button
                type="button"
                role="menuitem"
                className="admin-user-logout-btn"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleLogout();
                }}
              >
                <span>🚪</span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="container-fluid flex-grow-1 py-2 px-2">
        {avisoStudio && (
          <div
            className="alert alert-success py-2 px-3 small fw-bold d-flex align-items-center justify-content-between mb-2"
            role="alert"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', borderColor: '#10b981', color: '#6ee7b7' }}
          >
            <span>{avisoStudio}</span>
            <button
              type="button"
              className="btn-close btn-close-white btn-sm"
              aria-label="Cerrar"
              onClick={() => setAvisoStudio('')}
            />
          </div>
        )}

        {/* Mantiene vivo el iframe de Studio al cambiar entre Studio y Calculadora para no perder el diseño 3D */}
        {studioCargado && (
          <div
            style={{
              display: tabActiva === 'studio' ? 'block' : 'none',
              width: '100%',
              height: 'calc(100vh - 82px)',
              minHeight: '640px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 14px 40px rgba(0, 0, 0, 0.55)',
              backgroundColor: '#060c17',
            }}
          >
            <iframe
              title="PixelCraft LED Studio 3D"
              src="/studio/index.html?embedded=1"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        )}

        {tabActiva === 'calculadora' ? (
          <section className="pc-module-shell" aria-label="PixelCraft Cost Lab">
            <header className="pc-module-topbar">
              <div className="pc-module-brand">
                <div className="pc-module-icon costlab" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="11" x2="8.01" y2="11" />
                    <line x1="12" y1="11" x2="12.01" y2="11" />
                    <line x1="16" y1="11" x2="16.01" y2="11" />
                    <line x1="8" y1="15" x2="8.01" y2="15" />
                    <line x1="12" y1="15" x2="12.01" y2="15" />
                    <line x1="16" y1="15" x2="16.01" y2="15" />
                    <line x1="8" y1="19" x2="12" y2="19" />
                    <line x1="16" y1="19" x2="16.01" y2="19" />
                  </svg>
                </div>
                <div>
                  <div className="pc-module-title-row">
                    <span className="pc-module-title-base">PixelCraft</span>
                    <span className="pc-module-title-accent costlab">Cost Lab</span>
                    <span className="pc-module-version">v1.0</span>
                  </div>
                  <div className="pc-module-subtitle">Calculadora de Costos y Presupuestos 3D</div>
                </div>
              </div>

              <div className="pc-module-status-group">
                <span className="pc-module-pill">
                  📦 {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}
                </span>
                <span className="pc-module-pill cloud">
                  <span className="pc-module-pill-dot" />
                  Firebase Cloud · Sincronizado
                </span>
              </div>
            </header>

            <div className="pc-module-body">
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
                  />
                </div>

                {/* 3. HISTORIAL DE TRABAJOS */}
                <div className="col-lg-4 col-md-12">
                  <ListaProyectos 
                    proyectos={proyectos} 
                    eliminarProyecto={eliminarProyecto} 
                    limpiarTodo={limpiarTodo} 
                    cargarParaEditar={cargarParaEditar}
                    irAVentas={abrirVentaParaProyecto}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : tabActiva === 'ventas' ? (
          <section className="pc-module-shell finance-theme" aria-label="PixelCraft Finance">
            <header className="pc-module-topbar">
              <div className="pc-module-brand">
                <div className="pc-module-icon finance" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M7 15l4-4 3 3 6-7" />
                    <path d="M16 7h4v4" />
                  </svg>
                </div>
                <div>
                  <div className="pc-module-title-row">
                    <span className="pc-module-title-base">PixelCraft</span>
                    <span className="pc-module-title-accent finance">Finance</span>
                    <span className="pc-module-version">v1.0</span>
                  </div>
                  <div className="pc-module-subtitle">Ventas, Gastos y Balance del Taller</div>
                </div>
              </div>

              <div className="pc-module-status-group">
                <span className="pc-module-pill">
                  🧾 {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} · {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}
                </span>
                <span className="pc-module-pill cloud">
                  <span className="pc-module-pill-dot" />
                  Firebase Cloud · Sincronizado
                </span>
              </div>
            </header>

            <div className="pc-module-body">
              <ModuloVentas
                key={ventaInicial ? ventaInicial.nonce : 'ventas-default'}
                ventas={ventas}
                gastos={gastos}
                proyectos={proyectos}
                nombreEmisor={nombreEmisor}
                proyectoInicial={ventaInicial?.proyecto || null}
                onCerrarModalInicial={() => setVentaInicial(null)}
              />
            </div>
          </section>
        ) : null}
      </div>

      <ChatAsistenteIA
        abierto={chatAbierto}
        setAbierto={setChatAbierto}
        form={form}
        ultimoResultado={ultimoResultado}
        config={config}
        proyectos={proyectos}
        ventas={ventas}
        gastos={gastos}
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
