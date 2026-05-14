export const CONSUMOS = {
  PRECALENTAMIENTO: { watts: 350, horas: 0.083 },
  MATERIALES: {
    "PLA/PETG": 110,
    "ABS/ASA": 190
  },
  ACE_PRO: 65
};

export const VALORES_DEFECTO = {
  costoKWh: 120, 
  margenGanancia: 50
};

export const calcularPresupuestoFinal = (datos) => {
  const pMaterial = CONSUMOS.MATERIALES[datos.material] || 110;
  const pAce = datos.usaSecado ? CONSUMOS.ACE_PRO : 0; 
  const tImp = parseFloat(datos.tiempoTotal) || 0;

  // 1. Energía
  const arranqueWh = 600 * 0.083; 
  const energiaKWh = (arranqueWh + (pMaterial + pAce) * tImp) / 1000;
  const costoEnergia = energiaKWh * (parseFloat(datos.costoKWh) || 0);

  // 2. Material (+10% desperdicio)
  const precioFil = parseFloat(datos.precioFilamento) || 0;
  const pesoConDesperdicio = (parseFloat(datos.pesoTotal) || 0) * 1.1; 
  const costoMat = pesoConDesperdicio * (precioFil / 1000); 

  // 3. Amortización y Desgaste
  const vMaquina = (datos.valorMaquina !== undefined && datos.valorMaquina !== "") ? parseFloat(datos.valorMaquina) : 1200000;
  const mHora = (datos.mantenimientoHora !== undefined && datos.mantenimientoHora !== "") ? parseFloat(datos.mantenimientoHora) : 500;
  const costoAmortizacion = vMaquina / 3000;
  const costoDesgaste = tImp * (costoAmortizacion + mHora);

  // 4. Costos Extras y Mano de Obra
  const costoExtras = parseFloat(datos.insumosExternos) || 0;
  const costoManoObra = parseFloat(datos.manoObra) || 0;

  // 5. Costo Base (Lo que SÍ lleva ganancia: Material + Energía + Desgaste + Mano de Obra)
  const costoBaseConMargen = costoMat + costoEnergia + costoDesgaste + costoManoObra;

  // 6. Costo de Producción Total (Para tus registros de "COSTO REAL", incluye el extra)
  const costoProduccionTotal = costoBaseConMargen + costoExtras;

  // 7. Ganancia Base (Aplicada SOLO a la impresión y mano de obra, NO al extra)
  const porcentajeGanancia = parseFloat(datos.margenGanancia || 0) / 100;
  const gananciaNeta = costoBaseConMargen * porcentajeGanancia;
  
  // 8. Precio de Venta Base (Costo Total + Ganancia) 
  // Al costo total ya se le había sumado el extra neto en el paso 6.
  const precioVentaBase = costoProduccionTotal + gananciaNeta;

  // 9. Cálculo de Descuento (Si aplica)
  const porcentajeDescuento = parseFloat(datos.descuento || 0) / 100;
  const montoDescuento = precioVentaBase * porcentajeDescuento;
  const precioVentaFinal = precioVentaBase - montoDescuento;

  return {
    id: Date.now(),
    nombre: datos.nombreProyecto || "Sin Nombre",
    costoProduccion: costoProduccionTotal,
    precioOriginal: precioVentaBase, // Precio sin descuento
    precioVenta: precioVentaFinal,   // Precio final a cobrar
    montoDescuento: montoDescuento,  // Plata descontada
    margenUsado: datos.margenGanancia,
    detalle: {
      luz: costoEnergia,
      material: costoMat,
      desgaste: costoDesgaste,
      extras: costoExtras,           
      manoObra: costoManoObra        
    }
  };
};