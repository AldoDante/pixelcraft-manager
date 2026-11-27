import { redondearPrecioCliente } from './calculos';

export const CATEGORIAS_CATALOGO = {
  impresion_3d: 'Impresión 3D',
  carteleria_led: 'Cartelería LED 3D',
};

/**
 * Construye un documento seguro para la colección pública `catalogo_publico`.
 * Garantiza que nunca se expongan costos de producción, márgenes, desgaste ni datos de clientes.
 */
export function construirItemCatalogoPublico(calculoId, datos) {
  const tipoProyecto = datos?.tipoProyecto || 'impresion_3d';
  const precioBase =
    Number(datos?.precioVenta) > 0
      ? Number(datos.precioVenta)
      : Number(datos?.precioOriginal) || 0;

  const precioPublico = redondearPrecioCliente(precioBase);
  const horas = Number(datos?.tiempoTotal ?? datos?.horas) || 0;
  const tiempoEspera = (datos?.tiempoEspera || '').trim();

  return {
    calculoId,
    tipoProyecto,
    categoria: CATEGORIAS_CATALOGO[tipoProyecto] || CATEGORIAS_CATALOGO.impresion_3d,
    nombre: (datos?.nombre || 'Producto 3D').trim(),
    descripcion: (datos?.descripcion || '').trim(),
    imagenUrl: (datos?.imagenUrl || '').trim(),
    material: datos?.material || 'PLA/PETG',
    tiempoEspera: tiempoEspera || (horas > 0 ? `${Math.ceil(horas)} hs aprox.` : 'A convenir'),
    precioPublico,
    actualizadoEn: Date.now(),
  };
}

/**
 * Obtiene el precio público consistente para mostrar en catálogo y carrito.
 */
export function obtenerPrecioPublico(producto) {
  if (!producto) return 0;
  if (Number(producto.precioPublico) > 0) {
    return Number(producto.precioPublico);
  }
  return redondearPrecioCliente(producto.precioOriginal ?? producto.precioVenta ?? 0);
}
