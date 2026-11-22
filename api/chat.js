export const config = {
  maxDuration: 60,
};

const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDSNGg0sc91irKRdCrDry9KRTw_1024TKU';

const ALLOWED_EMAILS = (
  process.env.ALLOWED_ADMIN_EMAILS ||
  'dante.acuario79@gmail.com,japodeck@gmail.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const OPEN_WEBUI_URL = (
  process.env.OPEN_WEBUI_URL || 'https://aldo-dante.tail97f23e.ts.net'
).replace(/\/+$/, '');

const OPEN_WEBUI_MODEL = process.env.OPEN_WEBUI_MODEL || 'gemma4:26b';

async function verifyFirebaseToken(idToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const user = data?.users?.[0];
  return user?.email ? user.email.toLowerCase() : null;
}

function buildSystemPrompt(calculatorContext) {
  const base = [
    'Eres el asistente de IA privado de PixelCraft 3D (emprendimiento de impresión 3D en San Salvador de Jujuy, Argentina).',
    'Responde siempre en español claro, directo y útil. Puedes ayudar con cualquier consulta general (negocios, técnica de impresión 3D, estudio, programación o uso cotidiano).',
  ];

  if (calculatorContext) {
    base.push(
      '\nEl usuario eligió compartir el contexto actual de su calculadora de presupuestos 3D:',
      calculatorContext,
      '\nUsa estos datos exactos si la pregunta se refiere al presupuesto, costos, márgenes o redacción de mensajes para clientes (por ejemplo WhatsApp). Si pregunta sobre otro tema no relacionado, responde con normalidad sin forzar estos números.'
    );
  }

  return base.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!idToken) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión nuevamente.' });
  }

  let email;
  try {
    email = await verifyFirebaseToken(idToken);
  } catch (err) {
    console.error('Error verificando token Firebase:', err);
    return res.status(401).json({ error: 'Error al validar la sesión.' });
  }

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Tu cuenta no tiene permisos para usar el asistente.' });
  }

  const apiKey = process.env.OPEN_WEBUI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        'Falta configurar la variable OPEN_WEBUI_API_KEY en Vercel (Settings → Environment Variables).',
    });
  }

  const { messages, calculatorContext } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Debes enviar al menos un mensaje.' });
  }

  const sanitizedMessages = messages
    .slice(-16)
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

  const payload = {
    model: OPEN_WEBUI_MODEL,
    stream: false,
    messages: [
      { role: 'system', content: buildSystemPrompt(calculatorContext) },
      ...sanitizedMessages,
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const upstream = await fetch(`${OPEN_WEBUI_URL}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error('Open WebUI error:', upstream.status, errText.slice(0, 300));
      if (upstream.status === 502 || upstream.status === 503 || upstream.status === 504) {
        return res.status(503).json({
          error:
            'Tu PC con la IA local parece estar apagada o sin conexión en este momento.',
        });
      }
      return res.status(502).json({
        error: `El servidor de IA respondió con error (${upstream.status}).`,
      });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({ error: 'La IA devolvió una respuesta vacía.' });
    }

    return res.status(200).json({ reply, model: OPEN_WEBUI_MODEL });
  } catch (err) {
    clearTimeout(timeout);
    console.error('Upstream fetch error:', err?.name, err?.message);
    if (err?.name === 'AbortError') {
      return res.status(504).json({
        error:
          'La IA tardó demasiado en responder (quizás estaba cargando el modelo por primera vez). Intenta de nuevo en unos segundos.',
      });
    }
    return res.status(503).json({
      error:
        'No se pudo conectar con tu servidor local de IA. Verifica que tu PC, Ollama, Docker y Tailscale estén encendidos.',
    });
  }
}
