import { jsPDF } from 'jspdf';
import pixelcraftLogoUrl from '../assets/pixelcraft-logo.png';
import { calcularPresupuestoFinal, redondearPrecioCliente } from './calculos';

const formatoARS = (valor) => {
  const num = Number(valor);
  if (!Number.isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString('es-AR')}`;
};

const formatoFechaAR = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const sanitizarNombreArchivo = (texto) => {
  return (texto || 'Cotizacion')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Cotizacion';
};

let logoDataUrlCache = null;

async function obtenerLogoDataUrl() {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    if (typeof pixelcraftLogoUrl === 'string' && pixelcraftLogoUrl.startsWith('data:')) {
      logoDataUrlCache = pixelcraftLogoUrl;
      return logoDataUrlCache;
    }
    const res = await fetch(pixelcraftLogoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoDataUrlCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

// Limpia Markdown y caracteres no soportados por Helvetica (emojis, etc.)
const limpiarLineaParaPdf = (linea) => {
  return linea
    .replace(/`+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^\s*[-*•]\s+/, '• ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[^\u0020-\u00FF•]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimEnd();
};

// Quita textos meta de la IA (saludos introductorios, separadores, tablas raw, placeholders, sugerencias de envío)
const filtrarContenidoParaCliente = (texto) => {
  if (!texto) return '';
  const lineas = texto.split(/\r?\n/);
  const resultado = [];

  for (let i = 0; i < lineas.length; i++) {
    const raw = lineas[i];
    const trimmed = raw.trim();

    // Cortar cualquier bloque final de "Sugerencias..." o "Mensaje de WhatsApp..."
    if (
      /^\*{0,2}#{0,4}\s*(sugerencias|notas?\s+para\s+el\s+env[ií]o|consejos?\s+para|mensaje\s+de\s+whatsapp)/i.test(
        trimmed
      )
    ) {
      break;
    }

    // Omitir divisores markdown (---, ***, ___)
    if (/^[-*_]{3,}$/.test(trimmed)) continue;

    // Omitir líneas de tablas markdown
    if (/^\|.*\|$/.test(trimmed)) continue;

    // Omitir placeholders con corchetes [LOGOTIPO...], [Tu Teléfono...], [Insertar...]
    if (/\[(logotipo|logo|tu\s+tel[eé]fono|tu\s+instagram|insertar|nombre\s+del\s+cliente|mencionar)/i.test(trimmed)) {
      continue;
    }

    // Omitir línea introductoria conversacional si aparece al principio
    if (
      resultado.length === 0 &&
      /^(aqu[ií]\s+tienes|claro[,.!]|por\s+supuesto|con\s+gusto|te\s+dejo|a\s+continuaci[oó]n)/i.test(trimmed)
    ) {
      continue;
    }

    resultado.push(raw);
  }

  return resultado.join('\n').trim();
};

const dibujarEncabezado = (doc, { logoDataUrl, fechaEmision, fechaVencimiento, codigo, nombreEmisor }) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Banda superior oscura matching exacto con fondo del logo (#151921 -> RGB 21, 25, 33)
  doc.setFillColor(21, 25, 33);
  doc.rect(0, 0, pageWidth, 44, 'F');

  // Línea de acento cian
  doc.setFillColor(0, 212, 255);
  doc.rect(0, 44, pageWidth, 1.8, 'F');

  // Logo real más grande a la izquierda (155x51 -> ratio 3.039 -> 72mm x 23.7mm)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 12, 5.5, 72, 23.7);
  } else {
    doc.setTextColor(0, 212, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('PIXELCRAFT 3D', 15, 20);
  }

  doc.setTextColor(180, 195, 215);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Impresión 3D & Manufactura Aditiva · San Salvador de Jujuy', 15, 37);

  // Datos de presupuesto a la derecha
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PRESUPUESTO', pageWidth - 15, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 212, 228);
  doc.text(`Ref: ${codigo}`, pageWidth - 15, 20, { align: 'right' });
  doc.text(`Fecha: ${fechaEmision}  |  Válido hasta: ${fechaVencimiento}`, pageWidth - 15, 26, {
    align: 'right',
  });

  if (nombreEmisor) {
    doc.setTextColor(0, 212, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text(`Emitido por: ${limpiarLineaParaPdf(nombreEmisor)}`, pageWidth - 15, 34, {
      align: 'right',
    });
  }
};

const dibujarPiesDePagina = (doc) => {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(215, 222, 232);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 17, pageWidth - 15, pageHeight - 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      'Validez del presupuesto: 7 días corridos desde la fecha de emisión.',
      15,
      pageHeight - 10.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 10.5, {
      align: 'right',
    });
  }
};

export async function exportarPresupuestoPdf({
  contenidoIA = '',
  form = null,
  ultimoResultado = null,
  config = null,
  incluirDatosCalculadora = false,
  nombreEmisor = '',
  compartir = false,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = await obtenerLogoDataUrl();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const maxWidth = pageWidth - marginX * 2;
  const maxY = pageHeight - 24;

  const hoy = new Date();
  const vencimiento = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fechaEmision = formatoFechaAR(hoy);
  const fechaVencimiento = formatoFechaAR(vencimiento);
  const codigo = `PC-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(
    hoy.getDate()
  ).padStart(2, '0')}-${String(hoy.getHours()).padStart(2, '0')}${String(hoy.getMinutes()).padStart(2, '0')}`;

  const headerMeta = { logoDataUrl, fechaEmision, fechaVencimiento, codigo, nombreEmisor };
  dibujarEncabezado(doc, headerMeta);

  let y = 52;

  // Si no se presionó "Calcular" aún, calcular en vivo desde el formulario cargado para que NUNCA falte el precio
  let resultadoEfectivo = ultimoResultado;
  if (!resultadoEfectivo && form && (Number(form.pesoTotal) > 0 || Number(form.tiempoHoras) > 0 || Number(form.insumosExternos) > 0 || Number(form.manoObra) > 0)) {
    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);
    const impConfig = config?.impresoras?.[form.impresoraId] || {};
    resultadoEfectivo = calcularPresupuestoFinal({
      ...form,
      tiempoTotal: tiempoDecimal,
      costoKWh: config?.kwh,
      margenGanancia: form.margenGanancia !== '' && form.margenGanancia !== undefined ? form.margenGanancia : config?.margen,
      valorMaquina: impConfig.valorMaquina,
      vidaUtilHoras: impConfig.vidaUtilHoras,
      costoService500h: impConfig.costoService500h,
    });
  }

  // Bloque 1: Datos del cliente y medios de pago (si están cargados)
  const clienteNombre = limpiarLineaParaPdf(form?.clienteNombre || '');
  const clienteDireccion = limpiarLineaParaPdf(form?.clienteDireccion || '');
  const mediosPago = Array.isArray(form?.mediosPago)
    ? form.mediosPago.map((m) => limpiarLineaParaPdf(m)).filter(Boolean)
    : [];

  if (clienteNombre || clienteDireccion || mediosPago.length > 0) {
    const filas = [];
    if (clienteNombre) filas.push({ etiqueta: 'Cliente:', valor: clienteNombre });
    if (clienteDireccion) filas.push({ etiqueta: 'Dirección:', valor: clienteDireccion });
    if (mediosPago.length > 0) filas.push({ etiqueta: 'Medios de pago:', valor: mediosPago.join('  ·  ') });

    const boxH = 8 + filas.length * 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, y, maxWidth, boxH, 2.5, 2.5, 'FD');

    let fy = y + 7;
    for (const fila of filas) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.setTextColor(15, 23, 42);
      doc.text(fila.etiqueta, marginX + 5, fy);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(fila.valor, marginX + 35, fy);
      fy += 6;
    }

    y += boxH + 6;
  }

  // Bloque 2: Resumen del trabajo + Precio Final (solo datos aptos para el cliente, sin costos ni margen)
  if (incluirDatosCalculadora && resultadoEfectivo) {
    const nombreTrabajo = limpiarLineaParaPdf(
      resultadoEfectivo.nombre || form?.nombreProyecto || 'Impresión 3D a medida'
    );
    const material = limpiarLineaParaPdf(form?.material || 'PLA/PETG');
    const plazo = limpiarLineaParaPdf(form?.tiempoEspera || '');
    const extrasNota = limpiarLineaParaPdf(resultadoEfectivo.detalle?.notaExtras || form?.detalleExtras || '');

    const lineasInfo = [`Proyecto: ${nombreTrabajo}`, `Material: ${material}`];
    if (plazo) lineasInfo.push(`Plazo estimado: ${plazo}`);
    if (extrasNota) lineasInfo.push(`Incluye: ${extrasNota.slice(0, 62)}`);

    const boxHeight = Math.max(28, 13 + lineasInfo.length * 5.8);

    doc.setFillColor(244, 248, 252);
    doc.setDrawColor(0, 180, 220);
    doc.setLineWidth(0.45);
    doc.roundedRect(marginX, y, maxWidth, boxHeight, 2.5, 2.5, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RESUMEN DEL TRABAJO', marginX + 5, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(51, 65, 85);
    let infoY = y + 13.5;
    for (const ln of lineasInfo) {
      doc.text(ln, marginX + 5, infoY);
      infoY += 5.8;
    }

    // Caja de precio final a la derecha
    const priceBoxW = 58;
    const priceBoxH = 22;
    const priceBoxX = marginX + maxWidth - priceBoxW - 4;
    const priceBoxY = y + (boxHeight - priceBoxH) / 2;
    doc.setFillColor(21, 25, 33);
    doc.roundedRect(priceBoxX, priceBoxY, priceBoxW, priceBoxH, 2, 2, 'F');

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TOTAL FINAL', priceBoxX + priceBoxW / 2, priceBoxY + 6.5, { align: 'center' });

    doc.setTextColor(0, 212, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15.5);
    const precioClienteRedondeado = redondearPrecioCliente(resultadoEfectivo.precioVenta);
    doc.text(formatoARS(precioClienteRedondeado), priceBoxX + priceBoxW / 2, priceBoxY + 15.8, {
      align: 'center',
    });

    y += boxHeight + 9;
  }

  // Bloque 3: Detalle comercial redactado por la IA (limpio, sin sugerencias internas)
  const textoLimpio = filtrarContenidoParaCliente(contenidoIA);
  const textoBase = textoLimpio
    ? textoLimpio
    : 'Presupuesto generado por PixelCraft 3D. Ante cualquier consulta o modificación de medidas, colores o cantidades, estamos a disposición.';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text('DETALLE DEL PRESUPUESTO', marginX, y);
  y += 2.5;
  doc.setDrawColor(0, 212, 255);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, marginX + 48, y);
  y += 7;

  const lineasRaw = textoBase.split(/\r?\n/);

  for (const lineaRaw of lineasRaw) {
    const esTitulo = /^\s{0,3}#{1,6}\s+/.test(lineaRaw) || /^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(lineaRaw);
    const limpia = limpiarLineaParaPdf(lineaRaw);

    if (!limpia) {
      y += 3.2;
      continue;
    }

    const esVinieta = limpia.startsWith('• ');
    const xPos = esVinieta ? marginX + 3 : marginX;
    const anchoTexto = esVinieta ? maxWidth - 3 : maxWidth;

    doc.setFont('helvetica', esTitulo ? 'bold' : 'normal');
    doc.setFontSize(esTitulo ? 10.2 : 9.6);
    doc.setTextColor(esTitulo ? 15 : 30, esTitulo ? 23 : 41, esTitulo ? 42 : 59);

    const envueltas = doc.splitTextToSize(limpia, anchoTexto);

    for (const sub of envueltas) {
      if (y > maxY) {
        doc.addPage();
        dibujarEncabezado(doc, headerMeta);
        y = 52;
      }
      doc.text(sub, xPos, y);
      y += esTitulo ? 5.6 : 5.1;
    }

    if (esTitulo) y += 0.8;
  }

  dibujarPiesDePagina(doc);

  const nombreBase = sanitizarNombreArchivo(
    clienteNombre || resultadoEfectivo?.nombre || form?.nombreProyecto || 'Presupuesto'
  );
  const fechaArchivo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`;
  const nombreArchivo = `PixelCraft_${nombreBase}_${fechaArchivo}.pdf`;

  if (compartir && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Presupuesto PixelCraft 3D - ${resultadoEfectivo?.nombre || 'Cotización'}`,
          text: 'Adjunto el presupuesto solicitado (validez: 7 días).',
        });
        return { nombreArchivo, compartido: true };
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { nombreArchivo, compartido: false, cancelado: true };
      }
    }
  }

  doc.save(nombreArchivo);
  return { nombreArchivo, compartido: false };
}

export function soportaCompartirPdf() {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
