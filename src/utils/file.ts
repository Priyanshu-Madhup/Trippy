export const ACCEPTED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const
export const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp'
export const MAX_FILE_BYTES = 20 * 1024 * 1024

export function detectMime(file: File): string {
  if (file.type) return file.type === 'image/jpg' ? 'image/jpeg' : file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'application/octet-stream'
}

export function isPdfMime(mime: string | null | undefined) {
  return mime === 'application/pdf'
}

export function validateFile(file: File): string | null {
  const mime = detectMime(file)
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) return `${file.name} isn’t a PDF, PNG, JPG or WEBP file.`
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 20 MB.`
  if (file.size === 0) return `${file.name} is empty.`
  return null
}

/** Storage-safe file name, keeps the extension. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^\w.]/g, '') : ''
  return `${base || 'document'}${ext}`
}

async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' })
    } catch {
      /* fall back to <img> decoding */
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function drawScaled(source: ImageBitmap | HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Downscale very large photos before upload (keeps small files untouched). */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024) return file
  try {
    const canvas = drawScaled(await decode(file), 2400)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}

/** JPEG data URL sized for the vision model (keeps requests well under 4 MB). */
export async function imageToDataUrl(blob: Blob, maxDim = 1600, quality = 0.85): Promise<string> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(blob)
  } catch {
    throw new Error('This image format isn’t supported. Please upload a JPG, PNG or WEBP.')
  }
  let dim = maxDim
  let q = quality
  for (let i = 0; i < 4; i++) {
    const url = drawScaled(source, dim).toDataURL('image/jpeg', q)
    if (url.length < 3_000_000) return url
    dim = Math.round(dim * 0.8)
    q = Math.max(0.6, q - 0.08)
  }
  return drawScaled(source, 1000).toDataURL('image/jpeg', 0.7)
}
