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
import { structuredCompletion, visionTranscribe } from './groq.js'
import { HttpError } from './http.js'
import { buildExtraction, clamp01 } from './normalize.js'
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

export async function classifyDocument(
  rawText: string,
  fileName: string,
): Promise<{ type: DocumentType; confidence: number }> {
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
  const raw = await structuredCompletion({
    system: extractionSystem(type),
    user: documentUserMessage(fileName, rawText),
    schemaName: `${type}_extraction`,
    schema: extractionSchema(type),
  })
  return buildExtraction(type, raw, rawText, classifyConfidence)
}

export const extractFlight = (text: string, fileName: string, c?: number) => extractByType('flight', text, fileName, c)
export const extractHotel = (text: string, fileName: string, c?: number) => extractByType('hotel', text, fileName, c)
export const extractTrain = (text: string, fileName: string, c?: number) => extractByType('train', text, fileName, c)
export const extractBus = (text: string, fileName: string, c?: number) => extractByType('bus', text, fileName, c)
