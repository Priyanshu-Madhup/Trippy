import { HttpError, fetchWithTimeout } from './http.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-20b'
export const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'

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

function apiKey(): string {
  const key = process.env.GROQ_API_KEY
  if (!key || key.startsWith('your-')) {
    throw new HttpError(
      503,
      'ai_not_configured',
      'AI extraction is not configured. Add GROQ_API_KEY to the server environment.',
    )
  }
  return key
}

async function chat(options: ChatOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
    max_completion_tokens: options.maxTokens ?? 4096,
  }
  if (options.responseFormat) body.response_format = options.responseFormat
  if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort

  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
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

    const detail = await res.text().catch(() => '')
    console.warn(`[groq] ${options.model} ${res.status}: ${detail.slice(0, 500)}`)
    lastError = new HttpError(res.status === 400 ? 400 : 502, 'ai_error', 'The AI service returned an error.')
    // Retry only rate limits and transient upstream errors.
    if (res.status !== 429 && res.status < 500) break
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1) ** 2))
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

/**
 * Calls GPT-OSS with strict JSON-schema structured output. If schema mode is
 * rejected (e.g. a model override that doesn't support it) it falls back to
 * JSON mode with the schema embedded in the system prompt.
 */
export async function structuredCompletion(params: {
  system: string
  user: string
  schemaName: string
  schema: Record<string, unknown>
  maxTokens?: number
}): Promise<Record<string, unknown>> {
  const messages: ChatMessage[] = [
    { role: 'system', content: params.system },
    { role: 'user', content: params.user },
  ]
  try {
    const content = await chat({
      model: TEXT_MODEL,
      messages,
      reasoningEffort: 'low',
      maxTokens: params.maxTokens ?? 6000,
      responseFormat: {
        type: 'json_schema',
        json_schema: { name: params.schemaName, strict: true, schema: params.schema },
      },
    })
    return parseJsonObject(content)
  } catch (err) {
    if (!(err instanceof HttpError) || (err.status !== 400 && err.code !== 'ai_invalid_json')) throw err
    const content = await chat({
      model: TEXT_MODEL,
      reasoningEffort: 'low',
      maxTokens: params.maxTokens ?? 6000,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${params.system}\n\nRespond with one JSON object that matches this JSON Schema exactly:\n${JSON.stringify(params.schema)}`,
        },
        { role: 'user', content: params.user },
      ],
    })
    return parseJsonObject(content)
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
        content: [
          { type: 'text', text: prompt },
          ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
        ],
      },
    ],
  })
}
