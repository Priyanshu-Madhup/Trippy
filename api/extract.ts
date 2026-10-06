/**
 * POST /api/extract
 *
 * IMAGE → vision OCR (Groq) → GPT-OSS-20B classify → GPT-OSS-20B extract → JSON
 * PDF   → text (extracted in the browser) → GPT-OSS-20B classify → extract → JSON
 *
 * Requires a Supabase access token. GROQ_API_KEY never leaves the server.
 */
import type { ExtractRequest, ExtractResponse } from '../src/types/extraction.js'
import { requireUser } from './_lib/auth.js'
import { TEXT_MODEL, VISION_MODEL } from './_lib/groq.js'
import { HttpError, errorResponse, json, readJson } from './_lib/http.js'
import { assertReadable, classifyDocument, extractByType, transcribeImages } from './_lib/pipeline.js'

// Key details are on the first page; later pages are mostly T&Cs. Fewer tokens = fewer rate limits.
const MAX_TEXT = 12_000
const MAX_IMAGES = 3
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

export async function POST(request: Request): Promise<Response> {
  try {
    await requireUser(request)
    const body = await readJson<ExtractRequest>(request, 4_400_000)
    const fileName = String(body.file_name ?? 'document').slice(0, 200)

    // 1. Get the document text.
    let rawText: string
    let usedVision = false
    if (body.kind === 'images') {
      const images = (body.images ?? []).slice(0, MAX_IMAGES)
      if (images.length === 0 || !images.every((img) => typeof img === 'string' && IMAGE_DATA_URL.test(img))) {
        throw new HttpError(400, 'invalid_images', 'Images must be base64 JPEG, PNG or WEBP data URLs.')
      }
      rawText = await transcribeImages(images)
      usedVision = true
    } else if (body.kind === 'text') {
      rawText = String(body.text ?? '')
    } else {
      throw new HttpError(400, 'invalid_kind', 'kind must be "text" or "images".')
    }

    rawText = rawText.replace(/\u0000/g, '').trim().slice(0, MAX_TEXT)
    assertReadable(rawText)

    // 2. Classify, then 3. run the type-specific extraction (grounded against the source).
    const cls = await classifyDocument(rawText, fileName)
    const extraction = await extractByType(cls.type, rawText, fileName, cls.confidence)

    const response: ExtractResponse = {
      extraction,
      raw_text: rawText,
      models: { text: TEXT_MODEL, vision: usedVision ? VISION_MODEL : null },
    }
    return json(response)
  } catch (err) {
    return errorResponse(err)
  }
}
