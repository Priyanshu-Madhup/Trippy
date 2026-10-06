/**
 * PDF helpers (pdf.js). Loaded lazily — only when a PDF is processed.
 */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

async function open(blob: Blob) {
  const data = new Uint8Array(await blob.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const doc = await task.promise
  return { doc, close: () => void task.destroy() }
}

interface TextItemLike {
  str: string
  hasEOL?: boolean
  transform?: number[]
}

/** Extract text, preserving line structure, from the first `maxPages` pages. */
export async function extractPdfText(blob: Blob, maxPages = 8): Promise<{ text: string; pageCount: number }> {
  const { doc, close } = await open(blob)
  const pages: string[] = []
  try {
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let line = ''
      let lastY: number | null = null
      const lines: string[] = []
      for (const raw of content.items as TextItemLike[]) {
        if (typeof raw.str !== 'string') continue
        const y = raw.transform?.[5] ?? null
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && line.trim()) {
          lines.push(line.trim())
          line = ''
        }
        line += raw.str + (raw.str.endsWith(' ') ? '' : ' ')
        if (raw.hasEOL) {
          lines.push(line.trim())
          line = ''
        }
        lastY = y
      }
      if (line.trim()) lines.push(line.trim())
      pages.push(lines.filter(Boolean).join('\n'))
    }
    return { text: pages.join('\n\n— page break —\n\n').replace(/[ \t]+/g, ' ').trim(), pageCount: doc.numPages }
  } finally {
    close()
  }
}

/** Render pages to JPEG data URLs — used for scanned PDFs with no text layer. */
export async function renderPdfPages(blob: Blob, maxPages = 2, targetWidth = 1500): Promise<string[]> {
  const { doc, close } = await open(blob)
  const out: string[] = []
  try {
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(3, targetWidth / base.width) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) break
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, canvas, viewport }).promise
      out.push(canvas.toDataURL('image/jpeg', 0.82))
    }
    return out
  } finally {
    close()
  }
}
