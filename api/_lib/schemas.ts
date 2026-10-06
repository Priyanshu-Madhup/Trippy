/**
 * Strict JSON Schemas for GPT-OSS structured output. In strict mode every
 * property must be listed as required, so "optional" values are nullable.
 */
import { DOCUMENT_TYPES, type DocumentType } from '../../src/types/extraction.js'

type Schema = Record<string, unknown>

const str: Schema = { type: ['string', 'null'] }
const num: Schema = { type: ['number', 'null'] }
const int: Schema = { type: ['integer', 'null'] }
const date: Schema = { type: ['string', 'null'], description: 'YYYY-MM-DD or null' }
const time: Schema = { type: ['string', 'null'], description: 'HH:mm 24-hour or null' }
const strList: Schema = { type: 'array', items: { type: 'string' } }

function obj(properties: Record<string, Schema>, description?: string): Schema {
  return {
    type: 'object',
    ...(description ? { description } : {}),
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }
}

const provider = obj({
  name: str,
  domain: { type: ['string', 'null'], description: "Official website domain, e.g. 'makemytrip.com'" },
})

const flightEndpoint = obj({
  airport: str,
  airport_code: { type: ['string', 'null'], description: '3-letter IATA airport code' },
  city: str,
  country: str,
  date,
  time,
  terminal: str,
})

const transitEndpoint = obj({
  station: { type: ['string', 'null'], description: 'Station / boarding point name' },
  station_code: str,
  city: str,
  date,
  time,
})

export const DETAIL_SCHEMAS: Record<DocumentType, Schema> = {
  flight: obj({
    airline: obj({
      name: str,
      iata_code: { type: ['string', 'null'], description: '2-character IATA airline code' },
      domain: { type: ['string', 'null'], description: "Airline's official website domain" },
    }),
    segments: {
      type: 'array',
      description: 'One entry per flight leg, in travel order',
      items: obj({
        flight_number: str,
        departure: flightEndpoint,
        arrival: flightEndpoint,
        seat: str,
        cabin_class: str,
        duration: str,
      }),
    },
    pnr: str,
    ticket_number: str,
    baggage: str,
    passengers: strList,
  }),
  hotel: obj({
    hotel: obj({ name: str, address: str, city: str, country: str, phone: str, domain: str }),
    check_in: obj({ date, time }),
    check_out: obj({ date, time }),
    nights: int,
    rooms: int,
    room_type: str,
    guests: int,
    confirmation_number: str,
  }),
  train: obj({
    operator: provider,
    train_name: str,
    train_number: str,
    departure: transitEndpoint,
    arrival: transitEndpoint,
    pnr: str,
    coach: str,
    seat: str,
    berth: str,
    travel_class: str,
    passengers: strList,
  }),
  bus: obj({
    operator: provider,
    bus_type: str,
    departure: transitEndpoint,
    arrival: transitEndpoint,
    seat: str,
    ticket_number: str,
    pnr: str,
    passengers: strList,
  }),
  restaurant: obj({
    name: str,
    address: str,
    city: str,
    date,
    time,
    party_size: int,
    reservation_number: str,
    domain: str,
  }),
  activity: obj({
    name: str,
    venue: str,
    address: str,
    city: str,
    date,
    time,
    end_time: time,
    ticket_count: int,
    reference: str,
    domain: str,
  }),
  generic_travel_document: genericSchema(),
  unknown: genericSchema(),
}

function genericSchema(): Schema {
  return obj({
    issuer: str,
    key_facts: {
      type: 'array',
      description: 'Up to 8 important label/value facts found in the document',
      items: obj({ label: { type: 'string' }, value: { type: 'string' } }),
    },
    dates: { type: 'array', items: obj({ label: { type: 'string' }, date: { type: 'string' } }) },
    city: str,
  })
}

export const CLASSIFY_SCHEMA = obj({
  document_type: { type: 'string', enum: [...DOCUMENT_TYPES] },
  confidence: { type: 'number', description: '0 to 1' },
  reason: { type: 'string', description: 'One short sentence' },
})

export function extractionSchema(type: DocumentType): Schema {
  return obj({
    confidence: { type: 'number', description: '0 to 1 — how complete and certain the extraction is' },
    title: { type: ['string', 'null'], description: "Short human title, e.g. 'Bengaluru → Dubai' or 'Pullman Paris Tour Eiffel'" },
    summary: { type: ['string', 'null'], description: 'One sentence describing the booking' },
    booking_platform: obj(
      {
        name: str,
        domain: str,
      },
      'The agency / website the booking was made through (MakeMyTrip, Booking.com, Expedia…). Null if booked directly or unknown.',
    ),
    booking_reference: { type: ['string', 'null'], description: 'Main booking / confirmation reference exactly as printed' },
    primary_location: obj(
      {
        city: str,
        country: str,
        country_code: { type: ['string', 'null'], description: 'ISO 3166-1 alpha-2' },
      },
      'Where the traveller ends up / where the booking takes place',
    ),
    start_date: date,
    end_date: date,
    total_price: obj({ amount: num, currency: { type: ['string', 'null'], description: 'ISO 4217' } }),
    details: DETAIL_SCHEMAS[type],
  })
}

export const TRIP_INSIGHT_SCHEMA = obj({
  destination: { type: 'string', description: 'Primary destination — usually a city, or a region/country for multi-city trips' },
  country: str,
  country_code: { type: ['string', 'null'], description: 'ISO 3166-1 alpha-2' },
  image_query: { type: 'string', description: "Search phrase for a beautiful cover photo, e.g. 'London skyline Tower Bridge'" },
  confidence: { type: 'number' },
})
