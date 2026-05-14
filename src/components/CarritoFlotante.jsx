import React, { useContext, useState } from 'react';
import { CartContext } from '../context/CartContext';

function CarritoFlotante() {
  const { carrito, eliminarDelCarrito, vaciarCarrito, totalCarrito, cantidadTotal } = useContext(CartContext);
  const [isOpen, setIsOpen] = useState(false);

  // Formateador de moneda
  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  // Función para armar el mensaje y enviarlo por WhatsApp
  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;

    let mensaje = "👾 *HOLA PIXELCRAFT!* 👾\n\nQuiero encargar los siguientes diseños impresos en 3D:\n\n";
    
    carrito.forEach((item) => {
      mensaje += `🔹 ${item.cantidad}x *${item.nombre}*\n`;
      if (item.material) mensaje += `   ↳ Material: ${item.material}\n`;
      mensaje += `   ↳ Precio un.: ${formatoMoneda(item.precioOriginal)}\n\n`;
    });

    mensaje += `*TOTAL ESTIMADO: ${formatoMoneda(totalCarrito)}*\n\n`;
    mensaje += "¿Tienen disponibilidad para realizar este pedido?";

    const urlBase = "https://wa.me/+5493885190175"; // <-- CAMBIA ESTO POR TU NÚMERO
    const urlFinal = `${urlBase}?text=${encodeURIComponent(mensaje)}`;
    
    window.open(urlFinal, "_blank");
  };

  return (
    <>
      {/* Botón Flotante (Solo aparece si hay items en el carrito) */}
    {cantidadTotal > 0 && !isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="btn shadow-lg rounded-circle position-fixed d-flex justify-content-center align-items-center animate__animated animate__fadeIn"
          style={{ 
            bottom: '30px', 
            right: '30px', 
            width: '65px', 
            height: '65px', 
            backgroundColor: '#00d4ff', 
            color: '#0b0e14', 
            zIndex: 1050,
            border: '2px solid #fff'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          {/* Badge del contador */}
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style={{ fontSize: '0.8rem' }}>
            {cantidadTotal}
          </span>
        </button>
      )}

      {/* Panel Lateral (Offcanvas manual) */}
      <div 
        className={`offcanvas offcanvas-end ${isOpen ? 'show' : ''}`} 
        tabIndex="-1" 
        style={{ 
          visibility: isOpen ? 'visible' : 'hidden', 
          backgroundColor: '#0b0e14', 
          borderLeft: '1px solid #00d4ff',
          color: 'white'
        }}
      >
        <div className="offcanvas-header border-bottom" style={{ borderColor: '#2a2f3a' }}>
          <h5 className="offcanvas-title fw-bold" style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
            MI PEDIDO
          </h5>
          <button type="button" className="btn-close btn-close-white" onClick={() => setIsOpen(false)}></button>
        </div>
        
        <div className="offcanvas-body d-flex flex-column">
          {carrito.length === 0 ? (
            <p className="text-center mt-5 text-muted small">Tu carrito está vacío.</p>
          ) : (
            <>
              {/* Lista de productos */}
              <div className="flex-grow-1" style={{ overflowY: 'auto' }}>
                {carrito.map((item) => (
                  <div key={item.id} className="card mb-2" style={{ backgroundColor: '#151921', borderColor: '#2a2f3a' }}>
                    <div className="card-body p-2 position-relative">
                      <h6 className="fw-bold mb-1" style={{ fontSize: '0.9rem', paddingRight: '25px' }}>{item.cantidad}x {item.nombre}</h6>
                      <p className="mb-0 text-muted small">{item.material}</p>
                      <p className="mb-0 fw-bold" style={{ color: '#00d4ff' }}>{formatoMoneda(item.precioOriginal * item.cantidad)}</p>
                      
                      {/* Botón borrar item */}
                      <button 
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="btn btn-link position-absolute top-0 end-0 p-2"
                        style={{ color: '#ff4444' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total y Botón de WhatsApp */}
              <div className="pt-3 border-top mt-auto" style={{ borderColor: '#2a2f3a' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="fw-bold">TOTAL ESTIMADO:</span>
                  <span className="fs-4 fw-bold" style={{ color: '#00d4ff' }}>{formatoMoneda(totalCarrito)}</span>
                </div>
                <button onClick={enviarPedidoWhatsApp} className="btn w-100 fw-bold mb-2" style={{ backgroundColor: '#25D366', color: 'white' }}>
                  ENVIAR PEDIDO POR WHATSAPP
                </button>
                <button onClick={vaciarCarrito} className="btn btn-outline-danger w-100 btn-sm">
                  Vaciar Carrito
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Fondo oscuro para cerrar al hacer clic afuera (Backdrop manual) */}
      {isOpen && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 1040 }}
        ></div>
      )}
    </>
  );
}

export default CarritoFlotante;