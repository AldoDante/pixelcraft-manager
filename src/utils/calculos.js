import { CONSUMOS } from '../constants/config';

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

  // 4. Costo de Producción Unificado
  const costoProduccionTotal = costoMat + costoEnergia + costoDesgaste;

  // 5. Ganancia Base
  const porcentajeGanancia = parseFloat(datos.margenGanancia || 0) / 100;
  const gananciaNeta = costoProduccionTotal * porcentajeGanancia;
  const precioVentaBase = costoProduccionTotal + gananciaNeta;

  // 6. NUEVO: Cálculo de Descuento
  const porcentajeDescuento = parseFloat(datos.descuento || 0) / 100;
  const montoDescuento = precioVentaBase * porcentajeDescuento;
  const precioVentaFinal = precioVentaBase - montoDescuento;

  return {
    id: Date.now(),
    nombre: datos.nombreProyecto || "Sin Nombre",
    costoProduccion: costoProduccionTotal,
    precioOriginal: precioVentaBase, // Guardamos el precio sin descuento
    precioVenta: precioVentaFinal,   // Este es el precio final a cobrar
    montoDescuento: montoDescuento,  // Plata descontada
    margenUsado: datos.margenGanancia,
    detalle: {
      luz: costoEnergia,
      material: costoMat,
      desgaste: costoDesgaste
    }
  };
};