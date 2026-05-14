import React, { useState, useEffect, useContext } from 'react'; // <-- Agregamos useContext
import { Link } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CartContext } from '../context/CartContext'; // <-- Importamos nuestro Contexto

function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Extraemos la función para agregar al carrito desde el contexto
  const { agregarAlCarrito } = useContext(CartContext);

  useEffect(() => {
    const q = query(
      collection(db, "calculos"), 
      where("publicarCatalogo", "==", true)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setProductos(docs);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="catalogo-publico d-flex flex-column min-vh-100">
      {/* NAVEGACIÓN */}
      <nav className="navbar-public">
        <div className="brand">
          <div className="pixel-logo">P</div>
          <div className="brand-text">
            <span>PIXEL</span>
            <span>CRAFT</span>
          </div>
        </div>
        <div className="nav-links d-none d-md-flex">
          <a href="#inicio" className="nav-link">Inicio</a>
          <a href="#catalogo" className="nav-link">Catálogo</a>
          <a href="#materiales" className="nav-link">Materiales</a>
        </div>
        <Link to="/admin" className="btn-login text-decoration-none">ACCESO SOCIOS</Link>
      </nav>

      {/* BANNER PRINCIPAL (HERO) */}
      <header className="hero-section" id="inicio">
        <div className="hero-content">
          <h1>IMPRESIÓN 3D<br /><span>NIVEL PROFESIONAL</span></h1>
          <p>Diseño y manufactura aditiva en Jujuy. Desde prototipos técnicos hasta accesorios gamer con acabado premium en Silk y PETG.</p>
        </div>
        <div className="hero-image-placeholder">
          [ FOTO DESTACADA: CARTEL CORPÓREO ]
        </div>
      </header>

      {/* SECCIÓN DE PRODUCTOS DINÁMICA */}
      <section className="catalog-section container py-5 flex-grow-1" id="catalogo">
        <h2 className="section-title mb-4">Últimos Trabajos</h2>
        
        {cargando ? (
          <div className="text-center w-100" style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '10pt' }}>
            Cargando inventario...
          </div>
        ) : (
          <div className="row g-4">
            {productos.length > 0 ? (
              productos.map((producto) => (
                <div className="col-md-4" key={producto.id}>
                  <div className="product-card h-100">
                    <div className="product-img" style={{ padding: 0, overflow: 'hidden' }}>
                      {producto.imagenUrl ? (
                        <img 
                          src={producto.imagenUrl} 
                          alt={producto.nombre} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          '[ FOTO 3D ]'
                        </div>
                      )}
                    </div>
                    <div className="product-info">
                      <span className="product-category">Impresión 3D</span>
                      <h3 className="product-title">{producto.nombre}</h3>
                      
                      {producto.descripcion && (
                        <p className="small text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                          {producto.descripcion}
                        </p>
                      )}

                      <span className="product-price">
                        $ {producto.precioOriginal ? Number(producto.precioOriginal).toFixed(2) : 'Consultar'}
                      </span>
                      
                      <div className="meta-data">
                        <span>Mat: {producto.material || 'Consultar'}</span>
                        <span>
                          Tiempo: {producto.tiempoEspera ? producto.tiempoEspera : (producto.horas ? `${producto.horas} hs` : 'A convenir')}
                        </span>
                      </div>
                      
                      {/* --- ACÁ CAMBIAMOS EL BOTÓN --- */}
                      <button 
                        onClick={() => agregarAlCarrito(producto)} 
                        className="btn w-100 fw-bold mt-2 d-flex justify-content-center align-items-center gap-2"
                        style={{ backgroundColor: '#00d4ff', color: '#0b0e14', transition: 'all 0.3s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#00a3cc'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#00d4ff'; e.currentTarget.style.color = '#0b0e14'; }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        AGREGAR
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-12 text-center" style={{ color: '#888' }}>
                <p>No hay productos publicados por el momento.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* FOOTER (queda igual) */}
      <footer className="footer-public py-4 mt-auto">
        <div className="container text-center">
          <div className="brand-text mb-3 d-inline-flex">
            <span style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '12pt' }}>PIXELCRAFT 3D</span>
          </div>
          <p className="text-muted small mb-3">San Salvador de Jujuy, Argentina - {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default Catalogo;