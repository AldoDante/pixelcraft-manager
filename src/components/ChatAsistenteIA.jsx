import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { PERFILES_IMPRESORAS } from '../utils/calculos';

const formatoARS = (valor) => {
  const num = Number(valor);
  if (!Number.isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString('es-AR')}`;
};

function construirContextoCalculadora({ form, ultimoResultado, config, proyectos, ventas }) {
  const impresora = PERFILES_IMPRESORAS[form?.impresoraId];
  const horas = parseInt(form?.tiempoHoras, 10) || 0;
  const minutos = parseInt(form?.tiempoMinutos, 10) || 0;

  const lineas = [
    '=== DATOS ACTUALES EN LA CALCULADORA ===',
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
    lineas.push(
      '',
      '=== ÚLTIMO PRESUPUESTO CALCULADO ===',
      `Costo total de producción: ${formatoARS(ultimoResultado.costoProduccion)}`,
      `  - Material (incl. 10% desperdicio): ${formatoARS(ultimoResultado.detalle?.material)}`,
      `  - Electricidad (${Number(ultimoResultado.detalle?.kwhConsumidos || 0).toFixed(2)} kWh): ${formatoARS(ultimoResultado.detalle?.luz)}`,
      `  - Amortización + service: ${formatoARS(ultimoResultado.detalle?.desgasteYService)}`,
      `  - Mano de obra: ${formatoARS(ultimoResultado.detalle?.manoObra)}`,
      `  - Extras al costo: ${formatoARS(ultimoResultado.detalle?.extras)}`,
      `Precio de venta base (antes de descuento): ${formatoARS(ultimoResultado.precioOriginal)}`,
      `Descuento: -${formatoARS(ultimoResultado.montoDescuento)}`,
      `PRECIO FINAL AL CLIENTE: ${formatoARS(ultimoResultado.precioVenta)}`
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
}) {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [incluirContexto, setIncluirContexto] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiadoIdx, setCopiadoIdx] = useState(null);
  const finChatRef = useRef(null);

  useEffect(() => {
    if (abierto) {
      finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, cargando, abierto]);

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
        ? construirContextoCalculadora({ form, ultimoResultado, config, proyectos, ventas })
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

  const resumenChip = ultimoResultado
    ? `${ultimoResultado.nombre} · ${formatoARS(ultimoResultado.precioVenta)}`
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
              <span
                className="badge text-truncate"
                style={{
                  maxWidth: '170px',
                  backgroundColor: 'rgba(0, 212, 255, 0.14)',
                  color: '#00d4ff',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  fontWeight: 500,
                }}
                title={resumenChip}
              >
                {resumenChip}
              </span>
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
                      border: '1px solid #2e3647',
                      fontSize: '0.8rem',
                    }}
                    onClick={() => {
                      setIncluirContexto(true);
                      enviarMensaje(
                        'Redacta un mensaje breve, cordial y profesional para enviarle este presupuesto al cliente por WhatsApp.'
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
                        'Dame 3 consejos prácticos de impresión para esta pieza según la impresora, material y tiempo cargados.'
                      );
                    }}
                  >
                    🖨️ Consejos técnicos para imprimir esta pieza
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
                  <button
                    type="button"
                    onClick={() => copiarTexto(m.content, idx)}
                    className="btn btn-link p-0 mt-1 text-decoration-none"
                    style={{ fontSize: '0.72rem', color: '#94a3b8' }}
                  >
                    {copiadoIdx === idx ? '✅ Copiado' : '📋 Copiar'}
                  </button>
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
