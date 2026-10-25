const MODEL = process.env.NOVA_AI_MODEL || 'openai/gpt-6-luna';
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/responses';

function clean(value, max = 800) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const oidcHeader = req.headers['x-vercel-oidc-token'];
  const runtimeOidcToken = Array.isArray(oidcHeader) ? oidcHeader[0] : oidcHeader;
  const authToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || clean(runtimeOidcToken, 12000);

  if (!authToken) {
    return res.status(503).json({ ok: false, stage: 'auth', code: 'NO_TOKEN', model: MODEL });
  }

  try {
    const gatewayResponse = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        input: 'Reply with exactly OK.',
        max_output_tokens: 8,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await gatewayResponse.json().catch(() => ({}));
    if (!gatewayResponse.ok) {
      return res.status(200).json({
        ok: false,
        stage: 'gateway',
        status: gatewayResponse.status,
        model: MODEL,
        code: clean(data?.error?.code || data?.code || ''),
        detail: clean(data?.error?.message || data?.message || `Gateway ${gatewayResponse.status}`),
      });
    }

    return res.status(200).json({
      ok: true,
      stage: 'gateway',
      status: gatewayResponse.status,
      model: data?.model || MODEL,
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      stage: 'network',
      model: MODEL,
      detail: clean(error?.message || 'Unknown error'),
    });
  }
}
