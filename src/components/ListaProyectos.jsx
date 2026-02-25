import React from 'react';

const ListaProyectos = ({ proyectos, eliminarProyecto, limpiarTodo }) => {
  const formatear = (valor) => {
    return (valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  };

  return (
    <div className="card shadow border-0 h-100" style={{ maxHeight: '85vh' }}>
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold">Historial</h5>
        <span className="badge bg-white text-primary">{proyectos.length}</span>
      </div>
      
      <div className="card-body overflow-auto p-0" style={{ scrollbarWidth: 'thin' }}>
        {proyectos.length === 0 ? (
          <div className="text-center p-4 text-muted small">
            Sin proyectos guardados.
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {proyectos.map((p, index) => (
              <div key={index} className="list-group-item p-3 list-group-item-action">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <h6 className="fw-bold text-dark mb-1">{p.nombre}</h6>
                    <div className="d-flex gap-2 small flex-wrap">
                      <span className="badge bg-light text-dark border">
                        Costo: {formatear(p.costoProduccion)}
                      </span>
                      {parseFloat(p.margenUsado) > 0 && (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success">
                          Venta: {formatear(p.precioVenta)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-sm text-danger" onClick={() => eliminarProyecto(index)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {proyectos.length > 0 && (
        <div className="card-footer bg-light text-center p-1">
          <button className="btn btn-sm text-danger fw-bold" onClick={limpiarTodo}>
            Borrar Historial
          </button>
        </div>
      )}
    </div>
  );
};

export default ListaProyectos;