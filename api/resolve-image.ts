/**
 * GET /api/resolve-image?q=Paris&kind=destination|hotel|place&context=Paris
 * Returns { url, source, attribution } — url is null when nothing suitable exists.
 */
import { requireUser } from './_lib/auth.js'
import { HttpError, errorResponse, json } from './_lib/http.js'
import { resolveImage, type ImageKind } from './_lib/images.js'

const KINDS: ImageKind[] = ['destination', 'hotel', 'place']

export async function GET(request: Request): Promise<Response> {
  try {
    await requireUser(request)
    const params = new URL(request.url).searchParams
    const q = params.get('q')?.trim()
    const kind = (params.get('kind') ?? 'destination') as ImageKind
    if (!q) throw new HttpError(400, 'missing_query', 'q is required.')
    if (!KINDS.includes(kind)) throw new HttpError(400, 'invalid_kind', 'Unknown image kind.')

    const result = await resolveImage(q, kind, params.get('context'))
    return json(result, { cache: 'private, max-age=86400' })
  } catch (err) {
    return errorResponse(err)
  }
}
