/**
 * Client side of the AI pipeline. Prepares the document (text for PDFs,
 * downscaled JPEGs for images / scanned PDFs) and calls /api/extract, where
 * Groq does OCR, classification and structured extraction.
 */
import type { ExtractRequest, ExtractResponse } from '@/types/extraction'
import { imageToDataUrl, isPdfMime } from '@/utils/file'
import { apiFetch } from './api'

const MIN_PDF_TEXT = 60

function post(body: ExtractRequest) {
  return apiFetch<ExtractResponse>('/api/extract', { method: 'POST', body: JSON.stringify(body) })
}

/** Image → vision OCR → GPT-OSS-20B → structured JSON. */
export async function extractImageDocument(file: Blob, fileName: string, mimeType: string): Promise<ExtractResponse> {
  const image = await imageToDataUrl(file)
  return post({ kind: 'images', images: [image], file_name: fileName, mime_type: mimeType })
}

/** PDF → text extraction → GPT-OSS-20B → structured JSON. Scanned PDFs fall back to vision. */
export async function extractPdfDocument(file: Blob, fileName: string): Promise<ExtractResponse> {
  const { extractPdfText, renderPdfPages } = await import('@/utils/pdf')
  let text = ''
  try {
    text = (await extractPdfText(file)).text
  } catch {
    throw new Error('This PDF could not be opened. It may be password protected or damaged.')
  }
  if (text.replace(/\s+/g, '').length >= MIN_PDF_TEXT) {
    return post({ kind: 'text', text, file_name: fileName, mime_type: 'application/pdf' })
  }
  const images = await renderPdfPages(file, 2)
  if (images.length === 0) throw new Error("Couldn't read this document.")
  return post({ kind: 'images', images, file_name: fileName, mime_type: 'application/pdf' })
}

export function extractDocument(file: Blob, fileName: string, mimeType: string): Promise<ExtractResponse> {
  return isPdfMime(mimeType) ? extractPdfDocument(file, fileName) : extractImageDocument(file, fileName, mimeType)
}
