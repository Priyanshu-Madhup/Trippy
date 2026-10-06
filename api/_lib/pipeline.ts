/**
 * AI document pipeline (server-side).
 *
 *   transcribeImages()  — vision OCR for photos / screenshots / scanned PDFs
 *   classifyDocument()  — GPT-OSS-20B → document type + confidence
 *   extractFlight() / extractHotel() / extractTrain() / extractBus() / extractByType()
 *                       — GPT-OSS-20B → strict, type-specific JSON
 *   buildExtraction()   — normalise + drop anything not grounded in the source text
 */
import { DOCUMENT_TYPES, type DocumentExtraction, type DocumentType } from '../../src/types/extraction.js'
import { FALLBACK_TEXT_MODEL, structuredCompletion, visionTranscribe } from './groq.js'
import { HttpError } from './http.js'
import { buildExtraction, clamp01, isEmptyExtraction } from './normalize.js'
import { CLASSIFY_SYSTEM, OCR_PROMPT, documentUserMessage, extractionSystem } from './prompts.js'
import { CLASSIFY_SCHEMA, extractionSchema } from './schemas.js'

export async function transcribeImages(images: string[]): Promise<string> {
  const text = await visionTranscribe(images, OCR_PROMPT)
  return text.trim()
}

export function assertReadable(rawText: string): void {
  const readable = rawText
    .replace(/VISUAL NOTES:.*$/s, '')
    .replace(/\[illegible\]/g, '')
    .trim()
  if (rawText.includes('NO_TEXT_FOUND') || readable.length < 15) {
    throw new HttpError(422, 'unreadable', "Couldn't read this document.")
  }
}

/**
 * Keyword scoring for the obvious cases, so most uploads skip the LLM
 * classification call (halves tokens per upload and avoids rate limits).
 * Returns null when the document is ambiguous — the model decides then.
 */
const SIGNALS: Record<Exclude<DocumentType, 'unknown' | 'generic_travel_document'>, RegExp[]> = {
  flight: [
    /\bpnr\b/i,
    /\bflight\b/i,
    /\bairlines?\b|\bairways\b|\bair india\b|\bindigo\b|\bemirates\b/i,
    /\bboarding\b/i,
    /\bterminal\b/i,
    /\bairport\b/i,
    /\b(cabin|check-in) baggage\b/i,
    /\b[A-Z0-9]{2}\s?\d{2,4}\b/,
  ],
  hotel: [/\bcheck-?in\b/i, /\bcheck-?out\b/i, /\bhotel\b|\bresort\b|\bhostel\b|\bapartment\b/i, /\broom\b/i, /\bnights?\b/i, /\bguests?\b/i],
  train: [/\btrain\b/i, /\bcoach\b/i, /\bberth\b/i, /\birctc\b|\brailways?\b|\beurostar\b|\bamtrak\b|\bsncf\b/i, /\bstation\b/i, /\bplatform\b/i],
  bus: [/\bbus\b/i, /\bboarding point\b/i, /\bdropping point\b/i, /\bredbus\b|\bflixbus\b|\bvolvo\b|\bsleeper\b/i, /\boperator\b/i],
  restaurant: [/\brestaurant\b/i, /\btable\b/i, /\breservation\b/i, /\bparty of\b|\bdiners?\b/i, /\bdinner\b|\blunch\b/i],
  activity: [/\badmission\b/i, /\bentry\b/i, /\bmuseum\b|\btour\b|\bexperience\b|\battraction\b/i, /\bevent\b|\bshow\b|\bconcert\b/i, /\bvisit\b/i],
}

export function quickClassify(rawText: string): { type: DocumentType; confidence: number } | null {
  const head = rawText.slice(0, 5000)
  const scores = Object.entries(SIGNALS)
    .map(([type, patterns]) => ({ type: type as DocumentType, score: patterns.filter((re) => re.test(head)).length }))
    .sort((a, b) => b.score - a.score)
  const [top, second] = scores
  if (top.score >= 4 && top.score >= second.score * 2) return { type: top.type, confidence: 0.9 }
  return null
}

export async function classifyDocument(
  rawText: string,
  fileName: string,
): Promise<{ type: DocumentType; confidence: number }> {
  const quick = quickClassify(rawText)
  if (quick) return quick
  const out = await structuredCompletion({
    system: CLASSIFY_SYSTEM,
    user: documentUserMessage(fileName, rawText),
    schemaName: 'document_classification',
    schema: CLASSIFY_SCHEMA,
    maxTokens: 1500,
  })
  const type = (DOCUMENT_TYPES as readonly string[]).includes(String(out.document_type))
    ? (out.document_type as DocumentType)
    : 'unknown'
  return { type, confidence: clamp01(typeof out.confidence === 'number' ? out.confidence : 0.5) }
}

export async function extractByType(
  type: DocumentType,
  rawText: string,
  fileName: string,
  classifyConfidence = 1,
): Promise<DocumentExtraction> {
  const request = {
    system: extractionSystem(type),
    user: documentUserMessage(fileName, rawText),
    schemaName: `${type}_extraction`,
    schema: extractionSchema(type),
  }
  let extraction = buildExtraction(type, await structuredCompletion(request), rawText, classifyConfidence)

  // Malformed answers (wrong shape, empty details) get one more try on the backup model.
  if (isEmptyExtraction(extraction)) {
    console.warn(`[extract] empty ${type} details — retrying with ${FALLBACK_TEXT_MODEL}`)
    try {
      const retry = buildExtraction(type, await structuredCompletion({ ...request, model: FALLBACK_TEXT_MODEL }), rawText, classifyConfidence)
      if (!isEmptyExtraction(retry)) extraction = retry
    } catch {
      /* keep the first result */
    }
  }
  // Still nothing usable: never present it as a confident, finished card.
  if (isEmptyExtraction(extraction)) extraction = { ...extraction, confidence: Math.min(extraction.confidence, 0.4) }
  return extraction
}

export const extractFlight = (text: string, fileName: string, c?: number) => extractByType('flight', text, fileName, c)
export const extractHotel = (text: string, fileName: string, c?: number) => extractByType('hotel', text, fileName, c)
export const extractTrain = (text: string, fileName: string, c?: number) => extractByType('train', text, fileName, c)
export const extractBus = (text: string, fileName: string, c?: number) => extractByType('bus', text, fileName, c)
