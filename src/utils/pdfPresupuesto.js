import { jsPDF } from 'jspdf';

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

// Limpia Markdown y caracteres no soportados por Helvetica (emojis, etc.)
const limpiarLineaParaPdf = (linea) => {
  return linea
    // Quitar bloques de código o backticks
    .replace(/`+/g, '')
    // Quitar negritas/cursivas markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
    // Quitar encabezados markdown (#, ##, ###)
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    // Quitar citas markdown
    .replace(/^\s*>\s?/, '')
    // Normalizar viñetas
    .replace(/^\s*[-*•]\s+/, '• ')
    // Reemplazar comillas/guiones tipográficos
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    // Quitar emojis y símbolos fuera de Latin-1 / puntuación común
    .replace(/[^\u0020-\u00FF•]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimEnd();
};

const dibujarEncabezado = (doc, fechaEmision, fechaVencimiento, codigo) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Banda superior oscura estilo PixelCraft
  doc.setFillColor(11, 14, 20);
  doc.rect(0, 0, pageWidth, 34, 'F');

  // Línea de acento cian
  doc.setFillColor(0, 212, 255);
  doc.rect(0, 34, pageWidth, 1.5, 'F');

  // Marca izquierda
  doc.setTextColor(0, 212, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PIXELCRAFT 3D', 15, 16);

  doc.setTextColor(180, 195, 215);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Impresión 3D & Manufactura Aditiva · San Salvador de Jujuy', 15, 24);

  // Datos de presupuesto derecha
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PRESUPUESTO', pageWidth - 15, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 212, 228);
  doc.text(`Ref: ${codigo}`, pageWidth - 15, 19.5, { align: 'right' });
  doc.text(`Fecha: ${fechaEmision}  |  Válido hasta: ${fechaVencimiento}`, pageWidth - 15, 25.5, {
    align: 'right',
  });
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
  incluirDatosCalculadora = false,
  compartir = false,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

  dibujarEncabezado(doc, fechaEmision, fechaVencimiento, codigo);

  let y = 44;

  // Bloque resumen del presupuesto (solo datos aptos para el cliente, sin costos internos ni margen)
  if (incluirDatosCalculadora && ultimoResultado) {
    const nombreTrabajo = limpiarLineaParaPdf(ultimoResultado.nombre || form?.nombreProyecto || 'Impresion 3D a medida');
    const material = limpiarLineaParaPdf(form?.material || 'PLA/PETG');
    const plazo = limpiarLineaParaPdf(form?.tiempoEspera || '');
    const extrasNota = limpiarLineaParaPdf(ultimoResultado.detalle?.notaExtras || form?.detalleExtras || '');

    const boxHeight = extrasNota || plazo ? 34 : 26;

    doc.setFillColor(244, 248, 252);
    doc.setDrawColor(0, 180, 220);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, y, maxWidth, boxHeight, 2.5, 2.5, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('RESUMEN DEL TRABAJO', marginX + 5, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Proyecto: ${nombreTrabajo}`, marginX + 5, y + 14);
    doc.text(`Material: ${material}`, marginX + 5, y + 20);

    let extraY = y + 26;
    if (plazo) {
      doc.text(`Plazo estimado: ${plazo}`, marginX + 5, extraY);
      extraY += 5.5;
    } else if (extrasNota) {
      doc.text(`Detalles incluidos: ${extrasNota.slice(0, 58)}`, marginX + 5, extraY);
    }

    // Caja de precio final a la derecha
    const priceBoxW = 54;
    const priceBoxX = marginX + maxWidth - priceBoxW - 4;
    doc.setFillColor(11, 14, 20);
    doc.roundedRect(priceBoxX, y + 4.5, priceBoxW, boxHeight - 9, 2, 2, 'F');

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TOTAL FINAL', priceBoxX + priceBoxW / 2, y + 10.5, { align: 'center' });

    doc.setTextColor(0, 212, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(formatoARS(ultimoResultado.precioVenta), priceBoxX + priceBoxW / 2, y + 19, {
      align: 'center',
    });

    y += boxHeight + 10;
  }

  // Contenido redactado por la IA (o detalle base si se exportó directo)
  const textoBase = contenidoIA?.trim()
    ? contenidoIA
    : 'Presupuesto generado por PixelCraft 3D. Ante cualquier consulta o modificacion de medidas, colores o cantidades, estamos a disposicion.';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
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
      y += 3.5;
      continue;
    }

    const esVinieta = limpia.startsWith('• ');
    const xPos = esVinieta ? marginX + 3 : marginX;
    const anchoTexto = esVinieta ? maxWidth - 3 : maxWidth;

    doc.setFont('helvetica', esTitulo ? 'bold' : 'normal');
    doc.setFontSize(esTitulo ? 10.5 : 9.8);
    doc.setTextColor(esTitulo ? 15 : 30, esTitulo ? 23 : 41, esTitulo ? 42 : 59);

    const envueltas = doc.splitTextToSize(limpia, anchoTexto);

    for (const sub of envueltas) {
      if (y > maxY) {
        doc.addPage();
        dibujarEncabezado(doc, fechaEmision, fechaVencimiento, codigo);
        y = 44;
      }
      doc.text(sub, xPos, y);
      y += esTitulo ? 5.8 : 5.2;
    }

    if (esTitulo) y += 1;
  }

  dibujarPiesDePagina(doc);

  const nombreBase = sanitizarNombreArchivo(ultimoResultado?.nombre || form?.nombreProyecto || 'Presupuesto');
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
          title: `Presupuesto PixelCraft 3D - ${ultimoResultado?.nombre || 'Cotizacion'}`,
          text: 'Adjunto el presupuesto solicitado (validez: 7 dias).',
        });
        return { nombreArchivo, compartido: true };
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { nombreArchivo, compartido: false, cancelado: true };
      }
      // Si falla share, cae a descarga normal
    }
  }

  doc.save(nombreArchivo);
  return { nombreArchivo, compartido: false };
}

export function soportaCompartirPdf() {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
