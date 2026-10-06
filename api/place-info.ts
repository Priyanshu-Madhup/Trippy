/**
 * GET /api/place-info?q=Bengaluru
 * Weather, local news and a short overview for the dashboard's next trip.
 */
import { requireUser } from './_lib/auth.js'
import { HttpError, errorResponse, json } from './_lib/http.js'
import { getPlaceInfo } from './_lib/place.js'

export async function GET(request: Request): Promise<Response> {
  try {
    await requireUser(request)
    const q = new URL(request.url).searchParams.get('q')?.trim()
    if (!q) throw new HttpError(400, 'missing_query', 'q is required.')
    return json(await getPlaceInfo(q), { cache: 'private, max-age=900' })
  } catch (err) {
    return errorResponse(err)
  }
}
