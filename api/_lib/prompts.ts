import type { DocumentType } from '../../src/types/extraction.js'

const BASE_RULES = `You are a travel-document extraction engine.

Rules — follow all of them:
- Analyze only the provided travel document text.
- Extract only information that is actually present in the document. Never invent, guess or "fill in" missing values.
- Use null whenever a value is not clearly present. An empty array is fine for lists.
- Booking references, PNRs, flight numbers, seat numbers, ticket numbers, addresses, dates and times must be copied exactly as printed (only normalise formatting).
- Normalize dates to YYYY-MM-DD. If the year is missing, infer it only when unambiguous from other dates in the document; otherwise null.
- Normalize times to 24-hour HH:mm.
- Identify cities, airports, airlines, hotels, booking providers, reservation numbers and travel dates.
- You MAY use general world knowledge only to normalise names: IATA airport/airline codes for names printed in the document, the city/country of a named airport or hotel, ISO country codes, and the official website domain of a named company. Never use it to create booking data.
- A booking platform (MakeMyTrip, Booking.com, Expedia, Agoda, Goibibo, Cleartrip, Airbnb, Trip.com, Kayak, Yatra, EaseMyTrip, ixigo, RedBus, IRCTC…) is different from the airline/hotel/operator. Only set booking_platform if the document indicates it was booked through one.
- confidence is 0–1: high when the key fields are clearly present, low when the text is partial, noisy or ambiguous.
- Return valid JSON matching the provided schema. Do not include markdown.`

export const CLASSIFY_SYSTEM = `${BASE_RULES}

Task: decide which kind of travel document this is.
- flight: airline e-ticket, boarding pass, flight itinerary/booking.
- hotel: hotel, hostel, apartment or Airbnb-style stay.
- train: rail ticket/reservation (incl. IRCTC, Eurostar, SNCF, Amtrak, JR).
- bus: coach/bus ticket (RedBus, FlixBus, VRL…).
- restaurant: dining reservation.
- activity: tour, museum, attraction, event, show, experience ticket.
- generic_travel_document: visa, passport page, insurance, car rental, ferry, itinerary or anything travel-related that does not fit above.
- unknown: not a travel document or unreadable.`

const TYPE_GUIDANCE: Record<DocumentType, string> = {
  flight: `This is a FLIGHT document. Put every flight leg in details.segments in chronological order (a connecting itinerary BLR→DXB→LHR has two segments). airline is the operating/marketing airline printed on the ticket. details.pnr is the airline PNR / record locator (usually 6 characters, often labelled "PNR") — always fill it when printed. booking_reference is the agency's booking ID (e.g. MakeMyTrip "Booking ID") if present, otherwise the PNR. Times are local times as printed. title should be "<first departure city> → <final arrival city>". primary_location is the final arrival city of the outbound journey.`,
  hotel: `This is a HOTEL / accommodation booking. details.hotel.name is the property name. check_in/check_out dates and times as printed (times are often policies like "from 15:00"). nights only if printed or computable from both dates. title should be the property name. primary_location is the hotel's city.`,
  train: `This is a TRAIN ticket. operator is the rail company (e.g. Indian Railways / IRCTC, SNCF, Eurostar). Copy PNR, coach, seat and berth exactly. title should be "<departure city> → <arrival city>". primary_location is the arrival city.`,
  bus: `This is a BUS / coach ticket. operator is the bus company (e.g. VRL Travels, FlixBus). departure.station is the boarding point. title should be "<departure city> → <arrival city>". primary_location is the arrival city.`,
  restaurant: `This is a RESTAURANT reservation. title should be the restaurant name. primary_location is the restaurant's city.`,
  activity: `This is an ACTIVITY / attraction / event ticket. name is the activity or event, venue is the place. title should be the activity name. primary_location is the city where it happens.`,
  generic_travel_document: `This is a general travel document. Capture up to 8 of the most useful facts in details.key_facts (e.g. "Visa type", "Valid until", "Policy number", "Pick-up location") exactly as printed, and dated items in details.dates. title should describe the document in 2–5 words.`,
  unknown: `The document type is unclear. Capture up to 8 useful facts in details.key_facts exactly as printed and any dates in details.dates. title should describe the document in 2–5 words, or null.`,
}

export function extractionSystem(type: DocumentType): string {
  return `${BASE_RULES}\n\n${TYPE_GUIDANCE[type]}`
}

export function documentUserMessage(fileName: string, text: string): string {
  return `File name: ${fileName}\n\nDocument text:\n"""\n${text}\n"""`
}

export const OCR_PROMPT = `You are an OCR engine for travel documents (tickets, boarding passes, booking confirmations, screenshots).
Transcribe ALL text visible in the image(s) exactly as written, top to bottom, preserving line breaks and the label/value structure (e.g. "PNR: ABC123").
Do not summarise, translate, correct or add anything. Do not guess characters you cannot read — write [illegible] instead.
After the transcription, add a final section starting with "VISUAL NOTES:" listing any brand logos or company names that appear only as graphics (e.g. an airline or booking-site logo). If none, write "VISUAL NOTES: none".
If the image contains no readable text, respond with exactly: NO_TEXT_FOUND`

export const TRIP_INSIGHT_SYSTEM = `You determine the primary destination of a trip from its bookings.
- The primary destination is where the traveller spends most of their time — usually where the hotel is, not a connecting airport and not the home city they depart from and return to.
- Layover / transit cities (e.g. Dubai on a BLR→DXB→LHR itinerary) are not the destination unless there is a hotel or activity there.
- If the trip clearly spans several cities in one country or region, you may return the region or country (e.g. "Switzerland", "Northern Italy").
- Use only the cities given in the candidates and bookings. Prefer the trip name as a hint when it names a place.
- image_query should describe an iconic, beautiful photo of the destination (skyline or landmark).
Return valid JSON matching the schema. Do not include markdown.`
