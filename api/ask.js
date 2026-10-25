import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const MODEL = process.env.NOVA_AI_MODEL || 'openai/gpt-6-luna';
const RESPONSES_URL = 'https://ai-gateway.vercel.sh/v1/responses';
const CHAT_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 15;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const responseCache = globalThis.__novaAiCache || new Map();
const rateBuckets = globalThis.__novaAiRateBuckets || new Map();
globalThis.__novaAiCache = responseCache;
globalThis.__novaAiRateBuckets = rateBuckets;

function clean(value, max = 4000) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function safeItem(input = {}) {
  return {
    id: clean(input.id, 180),
    title: clean(input.title, 500),
    source: clean(input.source, 120),
    topic: clean(input.topic, 120),
    authors: clean(input.authors, 500),
    summary: clean(input.summary, 5000),
    why: clean(input.why, 1500),
    expert: clean(input.expert, 3500),
    url: clean(input.url, 800),
    publishedAt: clean(input.publishedAt, 80),
  };
}

function cacheKey(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return clean(ip || req.socket?.remoteAddress || 'unknown', 120);
}

async function resolveIdentity(req) {
  const authorization = clean(req.headers.authorization || '', 3000);
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (token && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const { data, error } = await authClient.auth.getUser(token);
      if (!error && data?.user?.id) {
        return { clientId: `user:${data.user.id}`, scope: 'account' };
      }
    } catch {
      // Invalid or temporarily unverifiable account tokens fall back to device/IP limits.
    }
  }

  return { clientId: `ip:${getIp(req)}`, scope: 'device' };
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const current = rateBuckets.get(clientId);
  if (!current || now - current.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(clientId, { startedAt: now, count: 1 });
    return { ok: true, remaining: RATE_LIMIT - 1 };
  }
  if (current.count >= RATE_LIMIT) return { ok: false, remaining: 0 };
  current.count += 1;
  return { ok: true, remaining: RATE_LIMIT - current.count };
}

function extractResponsesText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && content.text) parts.push(content.text);
      else if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n\n').trim();
}

function extractChatText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => typeof part === 'string' ? part : (part?.text || part?.content || ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }
  return '';
}

function gatewayError(label, response, data) {
  const code = clean(data?.error?.code || data?.code || '', 120);
  const detail = clean(data?.error?.message || data?.message || `Gateway ${response.status}`, 500);
  return `${label} ${response.status}${code ? ` (${code})` : ''}: ${detail}`;
}

function instructionsFor(mode, level, topic) {
  const levelGuide = {
    Simple: 'Use plain language, short sentences, and explain jargon immediately.',
    Professional: 'Use precise professional language, explain implications and important caveats.',
    Expert: 'Use technical language, discuss methodology, uncertainty, limitations, and what evidence would strengthen the claim.',
  }[level] || 'Use plain, precise language.';

  const domainGuard = topic === 'Health'
    ? 'For health content, do not diagnose, prescribe, or present research as personal medical advice.'
    : topic === 'Finance'
      ? 'For finance content, do not provide personalised investment instructions or guarantees.'
      : '';

  return [
    'You are NOVA, a careful research explainer inside a knowledge-discovery app.',
    'Use only the source context supplied in the user message. Do not invent findings, methods, statistics, citations, or facts not present in that context.',
    'If the context is insufficient to answer a question, say exactly what is missing and recommend opening the original source.',
    'Clearly distinguish peer-reviewed/indexed research, preprints, and technology-news signals when the source type makes that distinction relevant.',
    levelGuide,
    domainGuard,
    mode === 'explain'
      ? 'Produce a compact explanation with: What it says, Why it matters, and What to be cautious about. Keep it under 260 words.'
      : 'Answer the user question directly first, then give a short evidence/caveat note. Keep it under 220 words.',
  ].filter(Boolean).join(' ');
}

function buildInput(mode, question, level, item) {
  const sourceContext = [
    `Title: ${item.title}`,
    `Source: ${item.source}`,
    `Topic: ${item.topic}`,
    `Authors: ${item.authors || 'Not provided'}`,
    `Published: ${item.publishedAt || 'Not provided'}`,
    `Summary/abstract: ${item.summary || 'Not provided'}`,
    `NOVA why-it-matters note: ${item.why || 'Not provided'}`,
    `Additional research note: ${item.expert || 'Not provided'}`,
    `Original URL: ${item.url || 'Not provided'}`,
  ].join('\n');

  if (mode === 'ask') {
    return `SOURCE CONTEXT\n${sourceContext}\n\nUSER QUESTION\n${question}`;
  }
  return `SOURCE CONTEXT\n${sourceContext}\n\nTASK\nExplain this item at the ${level} level without adding unsupported claims.`;
}

function usageFromResponses(data) {
  return data?.usage ? {
    inputTokens: data.usage.input_tokens ?? null,
    outputTokens: data.usage.output_tokens ?? null,
    totalTokens: data.usage.total_tokens ?? null,
  } : null;
}

function usageFromChat(data) {
  return data?.usage ? {
    inputTokens: data.usage.prompt_tokens ?? null,
    outputTokens: data.usage.completion_tokens ?? null,
    totalTokens: data.usage.total_tokens ?? null,
  } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await resolveIdentity(req);
  const rate = checkRateLimit(identity.clientId);
  res.setHeader('X-NOVA-AI-Remaining', String(rate.remaining));
  res.setHeader('X-NOVA-AI-Scope', identity.scope);
  if (!rate.ok) {
    return res.status(429).json({ error: 'AI request limit reached. Try again later.', code: 'RATE_LIMITED' });
  }

  const mode = req.body?.mode === 'ask' ? 'ask' : 'explain';
  const level = ['Simple', 'Professional', 'Expert'].includes(req.body?.level) ? req.body.level : 'Simple';
  const question = clean(req.body?.question, 900);
  const item = safeItem(req.body?.item);

  if (!item.title || !item.summary) {
    return res.status(400).json({ error: 'A source item with title and summary is required.' });
  }
  if (mode === 'ask' && question.length < 3) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }

  const key = cacheKey({ mode, level, question: question.toLowerCase(), item });
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return res.status(200).json({ ...cached.payload, cached: true, remaining: rate.remaining, rateScope: identity.scope });
  }

  const oidcHeader = req.headers['x-vercel-oidc-token'];
  const runtimeOidcToken = Array.isArray(oidcHeader) ? oidcHeader[0] : oidcHeader;
  const authToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || clean(runtimeOidcToken, 12000);
  if (!authToken) {
    return res.status(503).json({
      error: 'NOVA AI is not available in this environment yet.',
      code: 'AI_NOT_CONFIGURED',
    });
  }

  const instructions = instructionsFor(mode, level, item.topic);
  const input = buildInput(mode, question, level, item);
  const maxTokens = mode === 'ask' ? 500 : 650;
  const failures = [];

  try {
    const responsesResult = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        instructions,
        input,
        max_output_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(25000),
    });

    const responsesData = await responsesResult.json().catch(() => ({}));
    if (responsesResult.ok) {
      const answer = extractResponsesText(responsesData);
      if (answer) {
        const payload = {
          answer,
          model: responsesData?.model || MODEL,
          usage: usageFromResponses(responsesData),
          cached: false,
          remaining: rate.remaining,
          rateScope: identity.scope,
          api: 'responses',
        };
        responseCache.set(key, { createdAt: Date.now(), payload });
        return res.status(200).json(payload);
      }
      failures.push('Responses API returned an empty response.');
    } else {
      failures.push(gatewayError('Responses API', responsesResult, responsesData));
    }
  } catch (error) {
    failures.push(`Responses API network error: ${clean(error?.message || 'Unknown error', 500)}`);
  }

  try {
    const chatResult = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(25000),
    });

    const chatData = await chatResult.json().catch(() => ({}));
    if (chatResult.ok) {
      const answer = extractChatText(chatData);
      if (answer) {
        const payload = {
          answer,
          model: chatData?.model || MODEL,
          usage: usageFromChat(chatData),
          cached: false,
          remaining: rate.remaining,
          rateScope: identity.scope,
          api: 'chat-completions',
        };
        responseCache.set(key, { createdAt: Date.now(), payload });
        return res.status(200).json(payload);
      }
      failures.push('Chat Completions returned an empty response.');
    } else {
      failures.push(gatewayError('Chat Completions', chatResult, chatData));
    }
  } catch (error) {
    failures.push(`Chat Completions network error: ${clean(error?.message || 'Unknown error', 500)}`);
  }

  return res.status(502).json({
    error: 'NOVA AI could not answer right now.',
    detail: clean(failures.join(' | '), 1000),
    code: 'AI_UPSTREAM_ERROR',
    model: MODEL,
  });
}
