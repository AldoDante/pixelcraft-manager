import React from 'react';

function ListaProyectos({ proyectos, eliminarProyecto, limpiarTodo, cargarParaEditar }) {
  
  const formatoMoneda = (valor) => (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  return (
    <div className="card shadow-sm h-100" style={{ backgroundColor: '#151921', borderColor: '#2a2f3a' }}>
      <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0b0e14', borderBottom: '1px solid #00d4ff' }}>
        <span className="fw-bold" style={{ color: '#00d4ff', fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem' }}>
          HISTORIAL ({proyectos.length})
        </span>
        {proyectos.length > 0 && (
          <button onClick={limpiarTodo} className="btn btn-sm py-0 fw-bold border-0" style={{ backgroundColor: '#ff4444', color: 'white', fontSize: '0.7rem' }}>
            Borrar Todo
          </button>
        )}
      </div>
      
      <div className="card-body p-2" style={{ maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#0b0e14' }}>
        {proyectos.length === 0 ? (
          <p className="text-center text-muted small mt-3">Sin proyectos guardados.</p>
        ) : (
          proyectos.map((p, index) => {
            const horasSeguras = p.tiempoTotal || p.horas || 0;
            const pesoSeguro = p.pesoTotal || p.peso || 0;

            return (
              <div 
                key={p.firestoreId || index} 
                className="card mb-2 position-relative"
                style={{ 
                  backgroundColor: '#151921',
                  border: '1px solid #2a2f3a',
                  borderLeft: '5px solid #00d4ff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onClick={() => cargarParaEditar(p)}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00d4ff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2f3a'}
              >
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between align-items-center">
                    
                    {/* INFO IZQUIERDA (Nombre, detalles y COSTO reubicado) */}
                    <div style={{ flex: 1, paddingRight: '10px', overflow: 'hidden' }}>
                      <h6 className="card-title mb-1 fw-bold text-white text-truncate" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem', letterSpacing: '1px' }}>
                        {p.nombre || "Sin Nombre"}
                      </h6>
                      <div className="text-muted small d-flex align-items-center gap-1 flex-wrap">
                        <span className="badge border" style={{ backgroundColor: 'transparent', color: '#00d4ff', borderColor: '#00d4ff !important' }}>{p.material}</span>
                        <span>{pesoSeguro}g</span> 
                        <span>•</span> 
                        <span>{Number(horasSeguras).toFixed(1)}h</span>
                        <span className="fw-bold" style={{ color: '#888' }}>
                          • Costo: {formatoMoneda(p.costoProduccion)}
                        </span>
                      </div>
                    </div>

                    {/* PRECIOS DERECHA (DESGLOSE MATEMÁTICO LIMPIO) */}
                    <div className="d-flex flex-column align-items-end justify-content-center" style={{ marginRight: '30px', minWidth: '110px' }}> 
                      
                      {p.montoDescuento > 0 ? (
                        /* --- VISTA CON DESCUENTO --- */
                        <div className="text-end w-100 mt-1">
                          {/* Operación Matemática (Sin el costo) */}
                          <div className="text-light" style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                            {formatoMoneda(p.precioOriginal)}
                          </div>
                          <div className="text-warning fw-bold" style={{ fontSize: '0.8rem' }}>
                            - {formatoMoneda(p.montoDescuento)} <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>({p.descuento}%)</span>
                          </div>
                          
                          {/* Línea divisoria */}
                          <hr className="my-1" style={{ borderColor: '#2a2f3a', borderTopWidth: '2px' }} />
                          
                          {/* Total Final */}
                          <div className="fw-bold" style={{ fontSize: '1.1rem', color: '#00d4ff', lineHeight: '1.2' }}>
                            {formatoMoneda(p.precioVenta)}
                          </div>
                        </div>
                      ) : (
                        /* --- VISTA NORMAL (Sin descuento) --- */
                        <div className="d-flex justify-content-end w-100">
                          <span className="fw-bold" style={{ fontSize: '1.1rem', color: '#00d4ff' }}>
                            {formatoMoneda(p.precioVenta)}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>
                  
                  {/* BOTÓN DE BORRAR */}
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      eliminarProyecto(p.firestoreId); 
                    }}
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-2"
                    title="Eliminar"
                    style={{ color: '#ff4444', opacity: 0.7, zIndex: 10 }} 
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