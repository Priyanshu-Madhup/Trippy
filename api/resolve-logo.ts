/**
 * GET /api/resolve-logo?name=Emirates&domain=emirates.com&iata=EK&kind=airline|platform|provider
 * Returns { url, source, domain } — url is null when no logo could be verified.
 */
import { requireUser } from './_lib/auth.js'
import { HttpError, errorResponse, json } from './_lib/http.js'
import { resolveLogo, type LogoQuery } from './_lib/logos.js'

const KINDS: LogoQuery['kind'][] = ['airline', 'platform', 'provider']

export async function GET(request: Request): Promise<Response> {
  try {
    await requireUser(request)
    const params = new URL(request.url).searchParams
    const kind = (params.get('kind') ?? 'provider') as LogoQuery['kind']
    if (!KINDS.includes(kind)) throw new HttpError(400, 'invalid_kind', 'Unknown logo kind.')

    const query: LogoQuery = {
      kind,
      name: params.get('name')?.slice(0, 120) ?? null,
      domain: params.get('domain')?.slice(0, 120) ?? null,
      iata: params.get('iata')?.slice(0, 3) ?? null,
    }
    if (!query.domain && !query.iata) return json({ url: null, source: null, domain: null })

    const result = await resolveLogo(query)
    return json(result, { cache: 'private, max-age=86400' })
  } catch (err) {
    return errorResponse(err)
  }
}
