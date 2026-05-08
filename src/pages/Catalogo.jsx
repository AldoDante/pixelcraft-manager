import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // 1. Apuntamos a la colección 'calculos'
    // 2. Filtramos para traer SOLO los que tienen 'publicarCatalogo' en true
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
                      {/* Si hay una URL de imagen, la mostramos. Si no, mostramos el placeholder */}
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
                      
                      {/* Mostramos la descripción si existe */}
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
                        {/* Mostramos tiempoEspera si existe, sino usamos el cálculo de horas */}
                        <span>
                          Tiempo: {producto.tiempoEspera ? producto.tiempoEspera : (producto.horas ? `${producto.horas} hs` : 'A convenir')}
                        </span>
                      </div>
                      
                      {/* Botón de WhatsApp con el nombre del producto en el mensaje */}
                      <a 
                        href={`https://wa.me/549388??????? text=Hola! Me interesa el producto: ${encodeURIComponent(producto.nombre)}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-buy w-100 text-center text-decoration-none d-block mt-2"
                      >
                        Consultar por WhatsApp
                      </a>
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

      {/* FOOTER */}
      <footer className="footer-public py-4 mt-auto">
        {/* ... (Tu código del footer se mantiene igual) ... */}
        <div className="container text-center">
          <div className="brand-text mb-3 d-inline-flex">
            <span style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '12pt' }}>PIXELCRAFT 3D</span>
          </div>
          <p className="text-muted small mb-3">San Salvador de Jujuy, Argentina - {new Date().getFullYear()}</p>
          <div className="social-icons d-flex justify-content-center gap-4">
             {/* ... SVGs de redes ... */}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Catalogo;