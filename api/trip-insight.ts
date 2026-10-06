/**
 * POST /api/trip-insight
 * Decides a trip's primary destination when its bookings point to several
 * places (e.g. BLR → DXB → LHR + a London hotel ⇒ London).
 */
import type { TripInsightRequest, TripInsightResponse } from '../src/types/extraction.js'
import { requireUser } from './_lib/auth.js'
import { structuredCompletion } from './_lib/groq.js'
import { HttpError, errorResponse, json, readJson } from './_lib/http.js'
import { clamp01, normalizeCountryCode, s } from './_lib/normalize.js'
import { TRIP_INSIGHT_SYSTEM } from './_lib/prompts.js'
import { TRIP_INSIGHT_SCHEMA } from './_lib/schemas.js'

export async function POST(request: Request): Promise<Response> {
  try {
    await requireUser(request)
    const body = await readJson<TripInsightRequest>(request, 200_000)
    if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
      throw new HttpError(400, 'no_candidates', 'No destination candidates provided.')
    }

    const payload = {
      trip_name: String(body.trip_name ?? '').slice(0, 120),
      current_destination: body.current_destination,
      candidates: body.candidates.slice(0, 20),
      bookings: (body.tickets ?? []).slice(0, 40),
    }

    const out = await structuredCompletion({
      system: TRIP_INSIGHT_SYSTEM,
      user: JSON.stringify(payload),
      schemaName: 'trip_destination',
      schema: TRIP_INSIGHT_SCHEMA,
      maxTokens: 2000,
    })

    const destination = s(out.destination, 80) ?? body.candidates[0].city
    const response: TripInsightResponse = {
      destination,
      country: s(out.country, 80),
      country_code: normalizeCountryCode(out.country_code),
      image_query: s(out.image_query, 120) ?? `${destination} skyline`,
      confidence: clamp01(typeof out.confidence === 'number' ? out.confidence : 0.6),
    }
    return json(response)
  } catch (err) {
    return errorResponse(err)
  }
}
