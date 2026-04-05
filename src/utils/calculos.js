import { CONSUMOS } from '../constants/config';

export const calcularPresupuestoFinal = (datos) => {
  // Potencias (obtenidas desde tu config)
  const pMaterial = CONSUMOS.MATERIALES[datos.material] || 110;
  const pAce = datos.usaSecado ? CONSUMOS.ACE_PRO : 0; 
  const tImp = parseFloat(datos.tiempoTotal) || 0;

  // 1. Energía (Ajustado al arranque real de 600W de la Kobra S1)
  const arranqueWh = 600 * 0.083; // 49.8 Wh para precalentamiento
  const energiaKWh = (arranqueWh + (pMaterial + pAce) * tImp) / 1000;
  const costoEnergia = energiaKWh * (parseFloat(datos.costoKWh) || 0);

  // 2. Material (+10% automático por purga del ACE Pro y soportes Tree Slim)
  const precioFil = parseFloat(datos.precioFilamento) || 0;
  // Multiplicamos el peso por 1.1 para absorber ese desperdicio
  const pesoConDesperdicio = (parseFloat(datos.pesoTotal) || 0) * 1.1; 
  const costoMat = pesoConDesperdicio * (precioFil / 1000); 

  // 3. Amortización y Desgaste (Fondo de repuestos)
  // Usamos lógica estricta para que respete el 0 si el usuario lo ingresa
  const vMaquina = (datos.valorMaquina !== undefined && datos.valorMaquina !== "") 
                   ? parseFloat(datos.valorMaquina) 
                   : 1200000;
                   
  const mHora = (datos.mantenimientoHora !== undefined && datos.mantenimientoHora !== "") 
                ? parseFloat(datos.mantenimientoHora) 
                : 500;
  
  // Amortización pura de la S1: (Valor de la máquina / 3000 horas)
  const costoAmortizacion = vMaquina / 3000;
  
  // Costo de Desgaste Total: Tiempo impreso * (Amortización + Costo de Mantenimiento por hora)
  const costoDesgaste = tImp * (costoAmortizacion + mHora);

  // 4. Costo de Producción Unificado
  const costoProduccionTotal = costoMat + costoEnergia + costoDesgaste;

  // 5. Ganancia
  const porcentajeGanancia = parseFloat(datos.margenGanancia || 0) / 100;
  const gananciaNeta = costoProduccionTotal * porcentajeGanancia;

  return {
    id: Date.now(),
    nombre: datos.nombreProyecto || "Sin Nombre",
    costoProduccion: costoProduccionTotal,
    precioVenta: costoProduccionTotal + gananciaNeta,
    margenUsado: datos.margenGanancia,
    detalle: {
      luz: costoEnergia,
      material: costoMat,
      desgaste: costoDesgaste // ← Este es tu colchón financiero para la máquina
    }
  };
};