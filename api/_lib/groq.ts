import { HttpError, fetchWithTimeout } from './http.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-20b'
/** Used only when the primary model is rate-limited — Groq quotas are per model. */
export const FALLBACK_TEXT_MODEL = process.env.GROQ_FALLBACK_TEXT_MODEL || 'openai/gpt-oss-120b'
export const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'

/** Longest we'll wait for a rate-limit window inside one request (Vercel caps functions at 60s). */
const MAX_RATE_LIMIT_WAIT_MS = 20_000

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

interface ChatOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: Record<string, unknown>
  reasoningEffort?: 'low' | 'medium' | 'high'
  timeoutMs?: number
}

/** Groq error with the parsed body, so callers can inspect codes like `json_validate_failed`. */
class GroqError extends HttpError {
  groqCode: string | null
  failedGeneration: string | null

  constructor(status: number, groqCode: string | null, failedGeneration: string | null, message: string) {
    super(status, status === 429 ? 'rate_limited' : 'ai_error', message)
    this.groqCode = groqCode
    this.failedGeneration = failedGeneration
  }
}

function apiKey(): string {
  const key = process.env.GROQ_API_KEY
  if (!key || key.startsWith('your-')) {
    throw new HttpError(503, 'ai_not_configured', 'AI extraction is not configured. Add GROQ_API_KEY to the server environment.')
  }
  return key
}

/** How long Groq asks us to wait: `retry-after` header, or "try again in 7.6s / 450ms" in the message. */
function retryDelayMs(res: Response, message: string): number {
  const header = Number(res.headers.get('retry-after'))
  if (Number.isFinite(header) && header > 0) return header * 1000
  const m = message.match(/try again in\s+(?:(\d+)m)?([\d.]+)(ms|s)/i)
  if (m) {
    const minutes = m[1] ? Number(m[1]) * 60_000 : 0
    return minutes + (m[3].toLowerCase() === 'ms' ? Number(m[2]) : Number(m[2]) * 1000)
  }
  return 2000
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function chat(options: ChatOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
    max_completion_tokens: options.maxTokens ?? 3000,
  }
  if (options.responseFormat) body.response_format = options.responseFormat
  if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort

  let lastError: HttpError = new HttpError(502, 'ai_error', 'The AI service returned an error.')
  let waited = 0
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response
    try {
      res = await fetchWithTimeout(
        GROQ_URL,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey()}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
        options.timeoutMs ?? 45_000,
      )
    } catch (err) {
      if (err instanceof HttpError) throw err
      lastError = new HttpError(504, 'ai_timeout', 'The AI took too long to respond.')
      continue
    }

    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] }
      return data.choices?.[0]?.message?.content ?? ''
    }

    const raw = await res.text().catch(() => '')
    let parsed: { error?: { message?: string; code?: string; failed_generation?: string } } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      /* non-JSON */
    }
    const message = parsed.error?.message ?? raw.slice(0, 300)
    console.warn(`[groq] ${options.model} ${res.status} ${parsed.error?.code ?? ''}: ${message.slice(0, 240)}`)
    lastError = new GroqError(res.status, parsed.error?.code ?? null, parsed.error?.failed_generation ?? null, message)

    if (res.status === 429) {
      const delay = retryDelayMs(res, message) + 250
      if (waited + delay > MAX_RATE_LIMIT_WAIT_MS) break
      waited += delay
      await sleep(delay)
      continue
    }
    if (res.status >= 500) {
      await sleep(600 * (attempt + 1) ** 2)
      continue
    }
    break // other 4xx — retrying won't help
  }
  throw lastError
}

function parseJsonObject(content: string): Record<string, unknown> {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
      } catch {
        /* fall through */
      }
    }
    throw new HttpError(502, 'ai_invalid_json', 'The AI returned an unreadable response.')
  }
}

async function structuredOnce(
  model: string,
  params: { system: string; user: string; schemaName: string; schema: Record<string, unknown>; maxTokens?: number },
): Promise<Record<string, unknown>> {
  try {
    const content = await chat({
      model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      reasoningEffort: 'low',
      maxTokens: params.maxTokens ?? 3000,
      responseFormat: { type: 'json_schema', json_schema: { name: params.schemaName, strict: true, schema: params.schema } },
    })
    return parseJsonObject(content)
  } catch (err) {
    // Strict validation failed (e.g. one optional field omitted): Groq returns the
    // generated JSON anyway. Our normaliser fills gaps with null, so use it as-is
    // instead of spending another request.
    if (err instanceof GroqError && err.groqCode === 'json_validate_failed' && err.failedGeneration) {
      try {
        return parseJsonObject(err.failedGeneration)
      } catch {
        /* fall through to JSON mode */
      }
    }
    if (!(err instanceof HttpError) || (err.status !== 400 && err.code !== 'ai_invalid_json')) throw err
    const content = await chat({
      model,
      reasoningEffort: 'low',
      maxTokens: params.maxTokens ?? 3000,
      responseFormat: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${params.system}\n\nRespond with one JSON object that matches this JSON Schema exactly:\n${JSON.stringify(params.schema)}` },
        { role: 'user', content: params.user },
      ],
    })
    return parseJsonObject(content)
  }
}

/**
 * GPT-OSS structured output (strict JSON schema). Falls back to the second
 * model only when the primary one is rate-limited.
 */
export async function structuredCompletion(params: {
  system: string
  user: string
  schemaName: string
  schema: Record<string, unknown>
  maxTokens?: number
}): Promise<Record<string, unknown>> {
  try {
    return await structuredOnce(TEXT_MODEL, params)
  } catch (err) {
    if (err instanceof HttpError && err.status === 429 && FALLBACK_TEXT_MODEL && FALLBACK_TEXT_MODEL !== TEXT_MODEL) {
      console.warn(`[groq] ${TEXT_MODEL} rate-limited — using ${FALLBACK_TEXT_MODEL}`)
      try {
        return await structuredOnce(FALLBACK_TEXT_MODEL, params)
      } catch {
        /* report the original rate limit */
      }
    }
    if (err instanceof HttpError && err.status === 429) {
      throw new HttpError(429, 'rate_limited', 'The AI is busy right now. Please retry in a minute.')
    }
    throw err
  }
}

/** Vision OCR — transcribes document images to plain text. */
export async function visionTranscribe(images: string[], prompt: string): Promise<string> {
  return chat({
    model: VISION_MODEL,
    temperature: 0,
    maxTokens: 4096,
    timeoutMs: 50_000,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }, ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } }))],
      },
    ],
  })
}
