import React from 'react';

function ListaProyectos({ proyectos, eliminarProyecto, limpiarTodo, cargarParaEditar }) {
  
  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  return (
    <div className="card shadow-sm h-100">
      <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
        <span className="fw-bold">HISTORIAL ({proyectos.length})</span>
        {proyectos.length > 0 && (
          <button onClick={limpiarTodo} className="btn btn-danger btn-sm py-0" style={{ fontSize: '0.7rem' }}>
            Borrar Todo
          </button>
        )}
      </div>
      
      <div className="card-body p-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {proyectos.length === 0 ? (
          <p className="text-center text-muted small mt-3">Sin proyectos guardados.</p>
        ) : (
          proyectos.map((p, index) => {
            const horasSeguras = p.tiempoTotal || p.horas || 0;
            const pesoSeguro = p.pesoTotal || p.peso || 0;

            return (
              <div 
                key={p.firestoreId || index} 
                className="card mb-2 position-relative proyecto-card"
                style={{ 
                  borderLeft: '5px solid #00d2ff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => cargarParaEditar(p)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between align-items-center">
                    
                    {/* INFO IZQUIERDA (Nombre y detalles) */}
                    <div className="text-truncate" style={{ flex: 1, paddingRight: '10px' }}>
                      <h6 className="card-title mb-1 fw-bold text-dark text-truncate">{p.nombre || "Sin Nombre"}</h6>
                      <div className="text-muted small">
                        <span className="badge bg-light text-dark border me-1">{p.material}</span>
                        <span>{pesoSeguro}g</span> • <span>{Number(horasSeguras).toFixed(1)}h</span>
                      </div>
                    </div>

                    {/* PRECIOS DERECHA (LADO A LADO) */}
                    <div className="d-flex align-items-center" style={{ marginRight: '25px' }}> 
                      
                      {/* Costo (Gris, a la izquierda) */}
                      <span className="text-secondary fw-bold me-2" style={{ fontSize: '0.85rem' }}>
                        {formatoMoneda(p.costoProduccion)}
                      </span>
                      
                      {/* Venta (Azul, a la derecha) */}
                      <span className="text-primary fw-bold" style={{ fontSize: '1.1rem' }}>
                        {formatoMoneda(p.precioVenta)}
                      </span>

                    </div>
                  </div>
                  
                  {/* BOTÓN DE BORRAR */}
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      eliminarProyecto(p.firestoreId); 
                    }}
                    className="btn btn-link text-danger position-absolute top-0 end-0 p-1"
                    title="Eliminar"
                    style={{ opacity: 0.7, zIndex: 10 }} 
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ListaProyectos;