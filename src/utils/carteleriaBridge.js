/**
 * Adaptador para integrar el futuro Diseñador de Cartelería LED 3D (PROLED Studio)
 * con la calculadora de costos de PixelCraft Manager.
 *
 * Recibe las métricas geométricas/eléctricas generadas por el motor 3D
 * y devuelve los campos listos para precargar `CalculadoraForm`.
 */
export function mapearCarteleriaAFormulario({
  nombreProyecto = '',
  structureCode = '',
  metrics = null,
  precios = {},
} = {}) {
  if (!metrics) return null;

  const minutosTotales = Math.max(0, Math.round(Number(metrics.estimatedPrintMinutes) || 0));
  const tiempoHoras = Math.floor(minutosTotales / 60);
  const tiempoMinutos = minutosTotales % 60;

  const areaAcrilicoM2 = Number(metrics.commercialAreaM2) || 0;
  const metrosLed = Number(metrics.ledToPurchaseMeters) || 0;
  const precioAcrilicoM2 = Number(precios.acrilicoPorM2) || 0;
  const precioLedMetro = Number(precios.ledPorMetro) || 0;
  const precioFuente = Number(precios.fuente12V) || 0;
  const otrosExtras = Number(precios.otrosExtras) || 0;

  const costoInsumosCartel =
    areaAcrilicoM2 * precioAcrilicoM2 +
    metrosLed * precioLedMetro +
    precioFuente +
    otrosExtras;

  const partesDetalle = [];
  if (structureCode) partesDetalle.push(`Estructura ${structureCode}`);
  if (areaAcrilicoM2 > 0) partesDetalle.push(`Acrílico ${areaAcrilicoM2.toFixed(2)} m²`);
  if (metrosLed > 0) partesDetalle.push(`LED ${metrosLed.toFixed(1)} m`);
  if (metrics.recommendedPowerWatts) {
    partesDetalle.push(
      `Fuente 12V ${metrics.recommendedPowerWatts}W (${metrics.recommendedPowerAmps12V || '?'}A)`
    );
  }
  if (metrics.recommendedCableMeters) {
    partesDetalle.push(`Cable ${metrics.recommendedCableMeters} m`);
  }

  return {
    tipoProyecto: 'carteleria_led',
    nombreProyecto: nombreProyecto || (structureCode ? `Cartel LED ${structureCode}` : 'Cartel LED 3D'),
    pesoTotal: metrics.totalFilamentGrams ? Number(metrics.totalFilamentGrams).toFixed(1) : '',
    tiempoHoras,
    tiempoMinutos,
    insumosExternos: costoInsumosCartel > 0 ? Math.round(costoInsumosCartel) : '',
    detalleExtras: partesDetalle.join(' + '),
    datosCarteleria: {
      structureCode: structureCode || null,
      commercialAreaM2: areaAcrilicoM2,
      commercialPerimeterM: Number(metrics.commercialPerimeterM) || 0,
      illuminableAreaM2: Number(metrics.illuminableAreaM2) || 0,
      actualDepthMm: Number(metrics.actualDepthMm) || 0,
      installedLedMeters: Number(metrics.installedLedMeters) || 0,
      ledToPurchaseMeters: metrosLed,
      recommendedCableMeters: Number(metrics.recommendedCableMeters) || 0,
      recommendedPowerWatts: Number(metrics.recommendedPowerWatts) || 0,
      recommendedPowerAmps12V: Number(metrics.recommendedPowerAmps12V) || 0,
    },
  };
}
