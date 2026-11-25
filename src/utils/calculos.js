// ==========================================
// PIXEL CRAFT 3D - MOTOR DE COSTOS v2.0
// ==========================================

export const PERFILES_IMPRESORAS = {
  "kobra-combo": {
    id: "kobra-combo",
    nombre: "Anycubic Kobra Combo (ACE Pro)",
    descripcion: "Multicolor con secador activo térmico ACE Pro",
    consumos: {
      "PLA/PETG": 110,
      "ABS/ASA": 190
    },
    consumoSecador: 65, // Resistencia calefactora activa del ACE Pro
    tieneSecadoTermico: true,
    valorMaquina: 1100000,
    vidaUtilHoras: 3000,
    costoService500h: 25000
  },
  "bambu-a1": {
    id: "bambu-a1",
    nombre: "Bambu Lab A1 (Stand-alone)",
    descripcion: "Monocolor (bobina superior, rieles metálicos)",
    consumos: {
      "PLA/PETG": 110,
      "ABS/ASA": 170
    },
    consumoSecador: 0, // Stand-alone sin AMS
    tieneSecadoTermico: false,
    valorMaquina: 900000,
    vidaUtilHoras: 4500,
    costoService500h: 30000
  },
  "snapmaker-u1": {
    id: "snapmaker-u1",
    nombre: "Snapmaker U1 (Multiherramienta)",
    descripcion: "Equipo multiherramienta de alta precisión y chasis industrial",
    consumos: {
      "PLA/PETG": 140,
      "ABS/ASA": 210
    },
    consumoSecador: 0,
    tieneSecadoTermico: false,
    valorMaquina: 1800000,
    vidaUtilHoras: 5000,
    costoService500h: 35000
  }
};

export const VALORES_DEFECTO = {
  costoKWh: 425,       // Calculado con boleta real de EJESA (Jujuy)
  margenGanancia: 100   // 100% sugerido (libre)
};

export const calcularPresupuestoFinal = (datos) => {
  // 0. Obtener perfil de la impresora seleccionada
  const impresora = PERFILES_IMPRESORAS[datos.impresoraId] || PERFILES_IMPRESORAS["kobra-combo"];
  const pMaterial = (impresora.consumos && impresora.consumos[datos.material]) || 110;
  const pSecador = (datos.usaSecado && impresora.tieneSecadoTermico) ? impresora.consumoSecador : 0;
  const tImp = parseFloat(datos.tiempoTotal) || 0;

  // 1. Energía Eléctrica Real
  const arranqueWh = 600 * 0.083; // Pico de calentamiento inicial (~5 min)
  const energiaKWh = (arranqueWh + (pMaterial + pSecador) * tImp) / 1000;
  const tarifaKWh = parseFloat(datos.costoKWh) || VALORES_DEFECTO.costoKWh;
  const costoEnergia = energiaKWh * tarifaKWh;

  // 2. Material (+10% desperdicio de purgas y soportes)
  const precioFil = parseFloat(datos.precioFilamento) || 0;
  const pesoConDesperdicio = (parseFloat(datos.pesoTotal) || 0) * 1.10;
  const costoMat = pesoConDesperdicio * (precioFil / 1000);

  // 3. Amortización de Máquina y Fondo para Service 500h
  const vMaquina = (datos.valorMaquina !== undefined && datos.valorMaquina !== "") 
    ? parseFloat(datos.valorMaquina) 
    : impresora.valorMaquina;

  const vidaHoras = (datos.vidaUtilHoras !== undefined && datos.vidaUtilHoras !== "") 
    ? parseFloat(datos.vidaUtilHoras) 
    : impresora.vidaUtilHoras;

  const costoService = (datos.costoService500h !== undefined && datos.costoService500h !== "") 
    ? parseFloat(datos.costoService500h) 
    : impresora.costoService500h;

  const costoAmortizacionHora = vMaquina / vidaHoras;
  const costoServiceHora = costoService / 500;
  const costoDesgasteYService = tImp * (costoAmortizacionHora + costoServiceHora);

  // 4. Insumos Extras (LEDs, cables, pegamento, tornillería) y Mano de Obra
  const costoExtras = parseFloat(datos.insumosExternos) || 0;
  const costoManoObra = parseFloat(datos.manoObra) || 0;

  // 5. Costo Base de Producción (Lo que lleva margen de ganancia: material, luz y desgaste)
  const costoBaseConMargen = costoMat + costoEnergia + costoDesgasteYService;

  // 6. Costo de Producción Total (Extras y Mano de Obra se suman al final sin margen encima)
  const costoProduccionTotal = costoBaseConMargen + costoExtras + costoManoObra;

  // 7. Ganancia Neta Libre (ej. 100% = x2, 200% = x3)
  const margen = datos.margenGanancia !== undefined && datos.margenGanancia !== "" 
    ? parseFloat(datos.margenGanancia) 
    : VALORES_DEFECTO.margenGanancia;
  const gananciaNeta = costoBaseConMargen * (margen / 100);

  // 8. Precio de Venta Base
  const precioVentaBase = costoProduccionTotal + gananciaNeta;

  // 9. Descuento
  const porcentajeDescuento = (parseFloat(datos.descuento) || 0) / 100;
  const montoDescuento = precioVentaBase * porcentajeDescuento;
  const precioVentaFinal = precioVentaBase - montoDescuento;

  return {
    id: Date.now(),
    nombre: datos.nombreProyecto || "Sin Nombre",
    impresoraId: impresora.id,
    impresoraNombre: impresora.nombre,
    costoProduccion: costoProduccionTotal,
    precioOriginal: precioVentaBase,
    precioVenta: precioVentaFinal,
    montoDescuento: montoDescuento,
    margenUsado: margen,
    detalle: {
      luz: costoEnergia,
      kwhConsumidos: energiaKWh,
      material: costoMat,
      desgasteYService: costoDesgasteYService,
      extras: costoExtras,
      notaExtras: datos.detalleExtras || "",
      manoObra: costoManoObra
    }
  };
};
