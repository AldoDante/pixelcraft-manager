import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { PERFILES_IMPRESORAS, calcularPresupuestoFinal, redondearPrecioCliente } from '../utils/calculos';
import { exportarPresupuestoPdf, soportaCompartirPdf } from '../utils/pdfPresupuesto';

const formatoARS = (valor) => {
  const num = Number(valor);
  if (!Number.isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString('es-AR')}`;
};

function obtenerResultadoEnVivo({ form, ultimoResultado, config }) {
  if (form && (Number(form.pesoTotal) > 0 || Number(form.tiempoHoras) > 0 || Number(form.insumosExternos) > 0 || Number(form.manoObra) > 0)) {
    const tiempoDecimal = (parseFloat(form.tiempoHoras) || 0) + ((parseFloat(form.tiempoMinutos) || 0) / 60);
    const impConfig = config?.impresoras?.[form.impresoraId] || {};
    return calcularPresupuestoFinal({
      ...form,
      tiempoTotal: tiempoDecimal,
      costoKWh: config?.kwh,
      margenGanancia:
        form.margenGanancia !== '' && form.margenGanancia !== undefined ? form.margenGanancia : config?.margen,
      valorMaquina: impConfig.valorMaquina,
      vidaUtilHoras: impConfig.vidaUtilHoras,
      costoService500h: impConfig.costoService500h,
    });
  }
  return ultimoResultado || null;
}

function construirContextoCalculadora({ form, ultimoResultado, config, proyectos, ventas, nombreEmisor }) {
  const impresora = PERFILES_IMPRESORAS[form?.impresoraId];
  const horas = parseInt(form?.tiempoHoras, 10) || 0;
  const minutos = parseInt(form?.tiempoMinutos, 10) || 0;
  const mediosPago = Array.isArray(form?.mediosPago) && form.mediosPago.length > 0
    ? form.mediosPago.join(', ')
    : 'No especificados';

  const lineas = [
    '=== DATOS ACTUALES EN LA CALCULADORA ===',
    `Presupuesto emitido por: ${nombreEmisor || 'PixelCraft 3D'}`,
    `Cliente: ${form?.clienteNombre || '(no especificado)'}`,
    `Dirección del cliente: ${form?.clienteDireccion || '(no especificada)'}`,
    `Medios de pago aceptados: ${mediosPago}`,
    `Proyecto: ${form?.nombreProyecto || '(sin nombre aún)'}`,
    `Impresora: ${impresora ? impresora.nombre : form?.impresoraId || 'No especificada'}`,
    `Material: ${form?.material || 'PLA/PETG'}`,
    `Peso total: ${form?.pesoTotal || 0} g`,
    `Precio del filamento: ${form?.precioFilamento ? formatoARS(form.precioFilamento) + '/kg' : 'No cargado'}`,
    `Tiempo de impresión: ${horas}h ${minutos}m`,
    `Secado activo (ACE Pro): ${form?.usaSecado ? 'Sí' : 'No'}`,
    `Margen de ganancia configurado: ${form?.margenGanancia ?? config?.margen ?? 100}%`,
    `Descuento aplicado: ${form?.descuento || 0}%`,
    `Insumos externos: ${formatoARS(form?.insumosExternos || 0)}${form?.detalleExtras ? ` (${form.detalleExtras})` : ''}`,
    `Mano de obra / post-proceso: ${formatoARS(form?.manoObra || 0)}`,
    `Tarifa eléctrica global: ${formatoARS(config?.kwh || 425)} / kWh`,
  ];

  if (ultimoResultado) {
    const precioClienteRedondeado = redondearPrecioCliente(ultimoResultado.precioVenta);
    lineas.push(
      '',
      '=== ÚLTIMO PRESUPUESTO CALCULADO ===',
      `Costo total de producción (interno): ${formatoARS(ultimoResultado.costoProduccion)}`,
      `  - Material (incl. 10% desperdicio): ${formatoARS(ultimoResultado.detalle?.material)}`,
      `  - Electricidad (${Number(ultimoResultado.detalle?.kwhConsumidos || 0).toFixed(2)} kWh): ${formatoARS(ultimoResultado.detalle?.luz)}`,
      `  - Amortización + service: ${formatoARS(ultimoResultado.detalle?.desgasteYService)}`,
      `  - Mano de obra (neta): ${formatoARS(ultimoResultado.detalle?.manoObra)}`,
      `  - Extras al costo: ${formatoARS(ultimoResultado.detalle?.extras)}`,
      `Precio de venta base interno (antes de descuento): ${formatoARS(ultimoResultado.precioOriginal)}`,
      `Descuento: -${formatoARS(ultimoResultado.montoDescuento)}`,
      `Precio exacto interno (calculadora): ${formatoARS(ultimoResultado.precioVenta)}`,
      `PRECIO FINAL PARA EL CLIENTE (redondeado hacia arriba a centena): ${formatoARS(precioClienteRedondeado)}`
    );
  } else {
    lineas.push('', '(Todavía no se presionó el botón Calcular para este formulario.)');
  }

  lineas.push(
    '',
    `Resumen histórico del panel: ${proyectos?.length || 0} proyectos guardados, ${ventas?.length || 0} ventas registradas.`
  );

  return lineas.join('\n');
}

function ChatAsistenteIA({
  abierto,
  setAbierto,
  form,
  ultimoResultado,
  config,
  proyectos,
  ventas,
  aiWebUrl,
  nombreEmisor,
}) {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [incluirContexto, setIncluirContexto] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiadoIdx, setCopiadoIdx] = useState(null);
  const [pdfFeedbackIdx, setPdfFeedbackIdx] = useState(null);
  const puedeCompartir = soportaCompartirPdf();
  const finChatRef = useRef(null);

  useEffect(() => {
    if (abierto) {
      finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, cargando, abierto]);

  const resultadoEnVivo = obtenerResultadoEnVivo({ form, ultimoResultado, config });

  const enviarMensaje = async (textoOpcional) => {
    const texto = (textoOpcional !== undefined ? textoOpcional : input).trim();
    if (!texto || cargando) return;

    setError('');
    const nuevosMensajes = [...mensajes, { role: 'user', content: texto }];
    setMensajes(nuevosMensajes);
    if (textoOpcional === undefined) setInput('');
    setCargando(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      }

      const idToken = await currentUser.getIdToken();
      const calculatorContext = incluirContexto
        ? construirContextoCalculadora({ form, ultimoResultado: resultadoEnVivo, config, proyectos, ventas, nombreEmisor })
        : null;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: nuevosMensajes,
          calculatorContext,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Error del servidor (${res.status})`);
      }

      setMensajes((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.message || 'No se pudo obtener respuesta de la IA.');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    enviarMensaje();
  };

  const copiarTexto = async (texto, idx) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoIdx(idx);
      setTimeout(() => setCopiadoIdx(null), 1800);
    } catch {
      // Fallback silencioso si el navegador bloquea portapapeles
    }
  };

  const descargarOCompartirPdf = async (contenidoIA, idx, compartir = false) => {
    try {
      const res = await exportarPresupuestoPdf({
        contenidoIA,
        form,
        ultimoResultado: resultadoEnVivo,
        config,
        incluirDatosCalculadora: incluirContexto && Boolean(resultadoEnVivo),
        nombreEmisor,
        compartir,
      });
      if (!res?.cancelado) {
        setPdfFeedbackIdx(idx);
        setTimeout(() => setPdfFeedbackIdx(null), 2000);
      }
    } catch (err) {
      console.error('Error generando PDF:', err);
      setError('No se pudo generar el PDF. Intenta nuevamente.');
    }
  };

  const resumenChip = resultadoEnVivo
    ? `${resultadoEnVivo.nombre} · ${formatoARS(redondearPrecioCliente(resultadoEnVivo.precioVenta))}`
    : form?.nombreProyecto
      ? `${form.nombreProyecto} (sin calcular)`
      : 'Formulario actual';

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="btn fw-bold shadow-lg d-flex align-items-center gap-2"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1050,
            backgroundColor: '#151921',
            color: '#c084fc',
            border: '2px solid #a855f7',
            borderRadius: '999px',
            padding: '10px 18px',
            boxShadow: '0 0 18px rgba(168, 85, 247, 0.45)',
          }}
        >
          <span>🤖</span>
          <span style={{ fontSize: '0.85rem', letterSpacing: '0.4px' }}>Asistente IA</span>
        </button>
      )}

      {/* VENTANA DE CHAT INTEGRADA */}
      {abierto && (
        <div
          className="card shadow-lg d-flex flex-column"
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            width: '410px',
            maxWidth: 'calc(100vw - 24px)',
            height: '580px',
            maxHeight: 'calc(100vh - 32px)',
            zIndex: 1060,
            backgroundColor: '#11151d',
            border: '1px solid #a855f7',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 18px rgba(168, 85, 247, 0.3)',
          }}
        >
          {/* CABECERA */}
          <div
            className="d-flex justify-content-between align-items-center px-3 py-2"
            style={{ backgroundColor: '#181e29', borderBottom: '1px solid #2b3242' }}
          >
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <div>
                <div className="fw-bold text-white" style={{ fontSize: '0.88rem', lineHeight: 1.1 }}>
                  PixelCraft IA
                </div>
                <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                  gemma4:26b · RTX 3090 local
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              {aiWebUrl && (
                <a
                  href={aiWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir Open WebUI completo (fotos, PDFs y búsqueda web)"
                  className="btn btn-sm py-0 px-2 text-decoration-none"
                  style={{
                    fontSize: '0.72rem',
                    color: '#00d4ff',
                    border: '1px solid rgba(0,212,255,0.4)',
                    backgroundColor: 'rgba(0,212,255,0.08)',
                  }}
                >
                  Open WebUI ↗
                </a>
              )}
              {mensajes.length > 0 && (
                <button
                  type="button"
                  title="Limpiar conversación"
                  onClick={() => {
                    setMensajes([]);
                    setError('');
                  }}
                  className="btn btn-sm text-secondary py-0 px-1"
                  style={{ fontSize: '0.85rem' }}
                >
                  🗑️
                </button>
              )}
              <button
                type="button"
                title="Cerrar"
                onClick={() => setAbierto(false)}
                className="btn btn-sm text-white py-0 px-2"
                style={{ fontSize: '1rem', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* BARRA DE CONTEXTO DE LA CALCULADORA */}
          <div
            className="d-flex justify-content-between align-items-center px-3 py-2 gap-2"
            style={{ backgroundColor: '#141923', borderBottom: '1px solid #232a38', fontSize: '0.76rem' }}
          >
            <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
              <input
                className="form-check-input m-0"
                type="checkbox"
                role="switch"
                id="switchContextoCalc"
                checked={incluirContexto}
                onChange={(e) => setIncluirContexto(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                className="form-check-label text-light"
                htmlFor="switchContextoCalc"
                style={{ cursor: 'pointer' }}
              >
                📎 Usar presupuesto actual
              </label>
            </div>
            {incluirContexto ? (
              <div className="d-flex align-items-center gap-1">
                <span
                  className="badge text-truncate"
                  style={{
                    maxWidth: '140px',
                    backgroundColor: 'rgba(0, 212, 255, 0.14)',
                    color: '#00d4ff',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    fontWeight: 500,
                  }}
                  title={resumenChip}
                >
                  {resumenChip}
                </span>
                {resultadoEnVivo && (
                  <button
                    type="button"
                    title="Exportar presupuesto actual directo a PDF"
                    onClick={() => descargarOCompartirPdf('', 'rapido', false)}
                    className="btn btn-sm py-0 px-2"
                    style={{
                      fontSize: '0.7rem',
                      color: '#fff',
                      backgroundColor: '#1f2937',
                      border: '1px solid #38bdf8',
                    }}
                  >
                    {pdfFeedbackIdx === 'rapido' ? '✅' : '📄 PDF'}
                  </button>
                )}
              </div>
            ) : (
              <span className="text-secondary">Modo chat libre</span>
            )}
          </div>

          {/* CUERPO DE MENSAJES */}
          <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-2">
            {mensajes.length === 0 && (
              <div className="my-auto text-center px-2">
                <p className="text-secondary small mb-3">
                  Pregúntame cualquier tema o usa el presupuesto cargado en la calculadora.
                </p>
                <div className="d-flex flex-column gap-2">
                  <button
                    type="button"
                    className="btn btn-sm text-start"
                    style={{
                      backgroundColor: '#181e29',
                      color: '#e2e8f0',
                      border: '1px solid #a855f7',
                      fontSize: '0.8rem',
                    }}
                    onClick={() => {
                      setIncluirContexto(true);
                      enviarMensaje(
                        'Redacta ÚNICAMENTE el texto comercial descriptivo del trabajo para incluir en el cuerpo de nuestro presupuesto PDF oficial (2 párrafos cortos y hasta 4 viñetas con las especificaciones y beneficios para el cliente). REGLAS ESTRICTAS: 1) NO incluyas saludos ni frases introductorias como "Aquí tienes...". 2) NO incluyas encabezados, [LOGOTIPO], fechas, número de presupuesto, tablas Markdown, líneas separadoras (--- o ***), corchetes [] ni teléfonos/redes. 3) NO incluyas NINGUNA sugerencia para el envío, consejo de diseño ni borrador de WhatsApp al final, ya que este texto irá directo al cliente. 4) NO menciones costos internos, luz, desgaste ni margen de ganancia. Empieza directamente con la descripción del trabajo.'
                      );
                    }}
                  >
                    📄 Redactar presupuesto formal listo para PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm text-start"
                    style={{
                      backgroundColor: '#181e29',
                      color: '#e2e8f0',
                      border: '1px solid #2e3647',
                      fontSize: '0.8rem',
                    }}
                    onClick={() => {
                      setIncluirContexto(true);
                      enviarMensaje(
                        'Redacta un mensaje breve, cordial y profesional para enviarle este presupuesto al cliente por WhatsApp (sin mostrar costos internos ni margen, mencionando validez de 7 días).'
                      );
                    }}
                  >
                    💬 Armar mensaje de WhatsApp con este presupuesto
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm text-start"
                    style={{
                      backgroundColor: '#181e29',
                      color: '#e2e8f0',
                      border: '1px solid #2e3647',
                      fontSize: '0.8rem',
                    }}
                    onClick={() => {
                      setIncluirContexto(true);
                      enviarMensaje(
                        'Revisa los costos y el margen de este presupuesto. ¿Ves algún costo subestimado o sugerencia para optimizarlo?'
                      );
                    }}
                  >
                    🔍 Revisar costos y margen de este trabajo
                  </button>
                </div>
              </div>
            )}

            {mensajes.map((m, idx) => (
              <div
                key={idx}
                className={`d-flex flex-column ${m.role === 'user' ? 'align-items-end' : 'align-items-start'}`}
              >
                <div
                  className="px-3 py-2 rounded-3"
                  style={{
                    maxWidth: '88%',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    backgroundColor: m.role === 'user' ? '#00d4ff' : '#1b2230',
                    color: m.role === 'user' ? '#0b0e14' : '#e5e7eb',
                    fontWeight: m.role === 'user' ? 500 : 400,
                    border: m.role === 'assistant' ? '1px solid #2b3447' : 'none',
                  }}
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && (
                  <div className="d-flex align-items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => copiarTexto(m.content, idx)}
                      className="btn btn-link p-0 text-decoration-none"
                      style={{ fontSize: '0.73rem', color: '#94a3b8' }}
                    >
                      {copiadoIdx === idx ? '✅ Copiado' : '📋 Copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => descargarOCompartirPdf(m.content, idx, false)}
                      className="btn btn-link p-0 text-decoration-none"
                      style={{ fontSize: '0.73rem', color: '#38bdf8' }}
                    >
                      {pdfFeedbackIdx === idx ? '✅ PDF listo' : '📄 Descargar PDF'}
                    </button>
                    {puedeCompartir && (
                      <button
                        type="button"
                        onClick={() => descargarOCompartirPdf(m.content, `share-${idx}`, true)}
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ fontSize: '0.73rem', color: '#c084fc' }}
                      >
                        {pdfFeedbackIdx === `share-${idx}` ? '✅ Enviado' : '📤 Compartir'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {cargando && (
              <div className="d-flex align-items-center gap-2 text-secondary small px-1">
                <span className="spinner-border spinner-border-sm text-info" role="status" />
                <span>Pensando en tu RTX 3090...</span>
              </div>
            )}

            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-0" role="alert">
                {error}
              </div>
            )}

            <div ref={finChatRef} />
          </div>

          {/* CAJA DE ENTRADA */}
          <form
            onSubmit={handleSubmit}
            className="p-2 d-flex gap-2 align-items-center"
            style={{ backgroundColor: '#181e29', borderTop: '1px solid #2b3242' }}
          >
            <input
              type="text"
              className="form-control form-control-sm bg-dark text-white border-secondary"
              placeholder={
                incluirContexto
                  ? 'Pregunta sobre este presupuesto o cualquier tema...'
                  : 'Escribe cualquier consulta...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={cargando}
            />
            <button
              type="submit"
              disabled={cargando || !input.trim()}
              className="btn btn-sm fw-bold px-3"
              style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none' }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatAsistenteIA;
