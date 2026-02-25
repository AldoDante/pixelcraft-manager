import { CONSUMOS } from '../constants/config';

export const calcularPresupuestoFinal = (datos) => {
  const pMaterial = CONSUMOS.MATERIALES[datos.material] || 110;
  const pAce = datos.usaSecado ? CONSUMOS.ACE_PRO : 0;
  
  // 1. Energía
  const energiaKWh = ((350 * 0.083) + (pMaterial + pAce) * parseFloat(datos.tiempoTotal)) / 1000;
  const costoEnergia = energiaKWh * parseFloat(datos.costoKWh);
  
  // 2. Material
  const precioFil = parseFloat(datos.precioFilamento) || 0;
  const costoMat = (parseFloat(datos.pesoTotal) * precioFil) / 1000;
  
  const costoProduccionTotal = costoMat + costoEnergia;
  
  // 3. Ganancia
  const porcentajeGanancia = parseFloat(datos.margenGanancia || 0) / 100;
  const gananciaNeta = costoProduccionTotal * porcentajeGanancia;

  return {
    id: Date.now(), // ID único para evitar errores en listas
    nombre: datos.nombreProyecto || "Sin Nombre",
    costoProduccion: costoProduccionTotal, // NOMBRE UNIFICADO
    precioVenta: costoProduccionTotal + gananciaNeta,
    margenUsado: datos.margenGanancia,
    detalle: {
      luz: costoEnergia,
      material: costoMat
    }
  };
};