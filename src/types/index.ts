import type { DocumentExtraction, DocumentType } from './extraction'

export type {
  ActivityData,
  BusData,
  DocumentExtraction,
  DocumentType,
  FlightData,
  FlightSegment,
  GenericData,
  HotelData,
  RestaurantData,
  TrainData,
} from './extraction'

export type ProcessingStatus = 'uploaded' | 'processing' | 'completed' | 'failed'

export interface Profile {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  preferences: { notifications?: boolean }
  created_at: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  destination: string | null
  country: string | null
  country_code: string | null
  destination_source: 'user' | 'ai'
  start_date: string | null
  end_date: string | null
  cover_image_url: string | null
  cover_image_source: string | null
  cover_image_attribution: string | null
  cover_image_query: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

/** Lightweight ticket info embedded in trip lists. */
export interface TripTicketSummary {
  id: string
  document_type: DocumentType
  processing_status: ProcessingStatus
}

export interface TripWithStats extends Trip {
  tickets: TripTicketSummary[]
}

export interface Ticket {
  id: string
  trip_id: string
  user_id: string
  file_path: string | null
  file_name: string | null
  file_type: 'pdf' | 'image' | null
  mime_type: string | null
  file_size: number | null
  document_type: DocumentType
  processing_status: ProcessingStatus
  error_message: string | null
  raw_text: string | null
  structured_data: DocumentExtraction | null
  confidence: number | null
  needs_review: boolean
  title: string | null
  summary: string | null
  provider_name: string | null
  airline_name: string | null
  airline_code: string | null
  airline_logo_url: string | null
  booking_platform: string | null
  booking_platform_logo_url: string | null
  provider_logo_url: string | null
  image_url: string | null
  booking_reference: string | null
  origin: string | null
  destination: string | null
  travel_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  notes: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface TicketWithTrip extends Ticket {
  trip: { id: string; name: string; destination: string | null } | null
}

export interface TripPlace {
  id: string
  trip_id: string
  ticket_id: string | null
  place_name: string
  place_type: 'city' | 'hotel' | 'airport' | 'station' | 'venue' | 'country'
  image_url: string | null
  source: string | null
  created_at: string
}

export interface CreateTripInput {
  name: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
}

export type TripPatch = Partial<Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type TicketPatch = Partial<Omit<Ticket, 'id' | 'user_id' | 'trip_id' | 'created_at' | 'updated_at'>>
export type NewTicket = Pick<Ticket, 'id' | 'trip_id'> & TicketPatch
