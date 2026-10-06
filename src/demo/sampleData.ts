/**
 * Sample data for development and first-run exploration.
 *
 * Kept completely separate from production data:
 *  - every row is flagged `is_demo = true`
 *  - it is only inserted on explicit request (Settings → "Add sample trips")
 *    or automatically in local demo mode (no Supabase configured)
 *  - "Remove sample data" deletes exactly these rows
 *
 * Dates are relative to today so the trips always look upcoming.
 * Images and logos are NOT hard-coded — they are resolved by the same
 * resolver pipeline as real uploads.
 */
import type {
  ActivityData,
  BusData,
  DocumentExtraction,
  FlightData,
  GenericData,
  HotelData,
  RestaurantData,
  Ticket,
  TrainData,
  Trip,
} from '@/types'
import { uuid } from '@/lib/utils'

export type SampleTrip = Omit<Trip, 'user_id' | 'created_at' | 'updated_at'>
export type SampleTicket = Omit<Ticket, 'user_id' | 'created_at' | 'updated_at'>

function day(offset: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function envelope<T extends DocumentExtraction['document_type']>(
  type: T,
  fields: Omit<DocumentExtraction<T>, 'schema_version' | 'document_type' | 'ungrounded_fields' | 'total_price'> &
    Partial<Pick<DocumentExtraction<T>, 'total_price'>>,
): DocumentExtraction<T> {
  return {
    schema_version: 1,
    document_type: type,
    ungrounded_fields: [],
    total_price: { amount: null, currency: null },
    ...fields,
  } as DocumentExtraction<T>
}

export function makeTicketRow(tripId: string, fields: Partial<SampleTicket> & Pick<SampleTicket, 'document_type'>): SampleTicket {
  return {
    id: uuid(),
    trip_id: tripId,
    file_path: null,
    file_name: null,
    file_type: null,
    mime_type: null,
    file_size: null,
    processing_status: 'completed',
    error_message: null,
    raw_text: null,
    structured_data: null,
    confidence: 0.95,
    needs_review: false,
    title: null,
    summary: null,
    provider_name: null,
    airline_name: null,
    airline_code: null,
    airline_logo_url: null,
    booking_platform: null,
    booking_platform_logo_url: null,
    provider_logo_url: null,
    image_url: null,
    booking_reference: null,
    origin: null,
    destination: null,
    travel_date: null,
    end_date: null,
    start_time: null,
    end_time: null,
    notes: null,
    is_demo: true,
    ...fields,
  }
}

export function buildSampleData(_userId: string): { trips: SampleTrip[]; tickets: SampleTicket[] } {
  const europe: SampleTrip = {
    id: uuid(),
    name: 'Europe 2026',
    destination: 'London',
    country: 'United Kingdom',
    country_code: 'GB',
    destination_source: 'ai',
    start_date: day(6),
    end_date: day(13),
    cover_image_url: null,
    cover_image_source: null,
    cover_image_attribution: null,
    cover_image_query: 'London skyline',
    is_demo: true,
  }
  const hyderabad: SampleTrip = {
    id: uuid(),
    name: 'Hyderabad weekend',
    destination: 'Hyderabad',
    country: 'India',
    country_code: 'IN',
    destination_source: 'ai',
    start_date: day(31),
    end_date: day(33),
    cover_image_url: null,
    cover_image_source: null,
    cover_image_attribution: null,
    cover_image_query: 'Hyderabad Charminar',
    is_demo: true,
  }
  const chennai: SampleTrip = {
    id: uuid(),
    name: 'Chennai by rail',
    destination: 'Chennai',
    country: 'India',
    country_code: 'IN',
    destination_source: 'ai',
    start_date: day(-41),
    end_date: day(-39),
    cover_image_url: null,
    cover_image_source: null,
    cover_image_attribution: null,
    cover_image_query: 'Chennai Marina Beach',
    is_demo: true,
  }

  // ─── Europe: Emirates via MakeMyTrip ────────────────────────────
  const flight: FlightData = {
    airline: { name: 'Emirates', iata_code: 'EK', domain: 'emirates.com' },
    segments: [
      {
        flight_number: 'EK569',
        departure: { airport: 'Kempegowda International Airport', airport_code: 'BLR', city: 'Bengaluru', country: 'India', date: day(6), time: '04:15', terminal: '2' },
        arrival: { airport: 'Dubai International Airport', airport_code: 'DXB', city: 'Dubai', country: 'United Arab Emirates', date: day(6), time: '06:30', terminal: '3' },
        seat: '24A',
        cabin_class: 'Economy',
        duration: '4h 45m',
      },
      {
        flight_number: 'EK1',
        departure: { airport: 'Dubai International Airport', airport_code: 'DXB', city: 'Dubai', country: 'United Arab Emirates', date: day(6), time: '07:45', terminal: '3' },
        arrival: { airport: 'London Heathrow Airport', airport_code: 'LHR', city: 'London', country: 'United Kingdom', date: day(6), time: '12:25', terminal: '3' },
        seat: '41K',
        cabin_class: 'Economy',
        duration: '7h 40m',
      },
    ],
    pnr: 'QX7K2M',
    ticket_number: '176-2419983021',
    baggage: '30 kg',
    passengers: ['Alex Morgan'],
  }

  const hotel: HotelData = {
    hotel: {
      name: 'London Marriott Hotel County Hall',
      address: 'Westminster Bridge Road, London SE1 7PB',
      city: 'London',
      country: 'United Kingdom',
      phone: '+44 20 7928 5200',
      domain: 'marriott.com',
    },
    check_in: { date: day(6), time: '15:00' },
    check_out: { date: day(10), time: '11:00' },
    nights: 4,
    rooms: 1,
    room_type: 'Deluxe King, River View',
    guests: 2,
    confirmation_number: '4417882190',
  }

  const eurostar: TrainData = {
    operator: { name: 'Eurostar', domain: 'eurostar.com' },
    train_name: 'Eurostar',
    train_number: '9014',
    departure: { station: 'London St Pancras International', station_code: 'STP', city: 'London', date: day(10), time: '08:01' },
    arrival: { station: 'Paris Gare du Nord', station_code: 'PNO', city: 'Paris', date: day(10), time: '11:20' },
    pnr: 'PZK4QW',
    coach: '7',
    seat: '63',
    berth: null,
    travel_class: 'Standard Premier',
    passengers: ['Alex Morgan'],
  }

  const louvre: ActivityData = {
    name: 'Musée du Louvre — timed entry',
    venue: 'Louvre Museum',
    address: 'Rue de Rivoli, 75001 Paris',
    city: 'Paris',
    date: day(11),
    time: '10:30',
    end_time: null,
    ticket_count: 2,
    reference: 'LV2026883104',
    domain: 'louvre.fr',
  }

  const visa: GenericData = {
    issuer: 'UK Visas and Immigration',
    key_facts: [
      { label: 'Visa type', value: 'Standard Visitor' },
      { label: 'Entries', value: 'Multiple' },
      { label: 'Valid from', value: day(-30) },
      { label: 'Valid until', value: day(150) },
    ],
    dates: [{ label: 'Valid until', date: day(150) }],
    city: null,
  }

  // ─── Hyderabad: VRL bus via redBus + dinner ─────────────────────
  const bus: BusData = {
    operator: { name: 'VRL Travels', domain: 'vrlbus.in' },
    bus_type: 'Volvo Multi-Axle Sleeper',
    departure: { station: 'Anand Rao Circle', station_code: null, city: 'Bengaluru', date: day(31), time: '21:00' },
    arrival: { station: 'Lakdikapul', station_code: null, city: 'Hyderabad', date: day(32), time: '06:30' },
    seat: '12',
    ticket_number: 'VRL88213409',
    pnr: null,
    passengers: ['Alex Morgan'],
  }

  const dinner: RestaurantData = {
    name: 'Jewel of Nizam',
    address: 'The Golkonda Hotel, Masab Tank, Hyderabad',
    city: 'Hyderabad',
    date: day(32),
    time: '20:00',
    party_size: 2,
    reservation_number: 'JN4471',
    domain: null,
  }

  // ─── Chennai: Shatabdi ──────────────────────────────────────────
  const shatabdi: TrainData = {
    operator: { name: 'Indian Railways', domain: 'irctc.co.in' },
    train_name: 'Shatabdi Express',
    train_number: '12008',
    departure: { station: 'KSR Bengaluru City Junction', station_code: 'SBC', city: 'Bengaluru', date: day(-41), time: '06:00' },
    arrival: { station: 'MGR Chennai Central', station_code: 'MAS', city: 'Chennai', date: day(-41), time: '12:45' },
    pnr: '4521876390',
    coach: 'C2',
    seat: '42',
    berth: null,
    travel_class: 'AC Chair Car',
    passengers: ['Alex Morgan'],
  }

  const tickets: SampleTicket[] = [
    makeTicketRow(europe.id, {
      document_type: 'flight',
      title: 'Bengaluru → London',
      summary: 'Emirates itinerary from Bengaluru to London via Dubai, booked on MakeMyTrip.',
      provider_name: 'Emirates',
      airline_name: 'Emirates',
      airline_code: 'EK',
      booking_platform: 'MakeMyTrip',
      booking_reference: 'QX7K2M',
      origin: 'Bengaluru',
      destination: 'London',
      travel_date: day(6),
      end_date: day(6),
      start_time: '04:15',
      end_time: '12:25',
      file_name: 'MakeMyTrip-Eticket-NF7A2B3C9D.pdf',
      confidence: 0.96,
      structured_data: envelope('flight', {
        confidence: 0.96,
        title: 'Bengaluru → London',
        summary: 'Emirates itinerary from Bengaluru to London via Dubai, booked on MakeMyTrip.',
        booking_platform: { name: 'MakeMyTrip', domain: 'makemytrip.com' },
        booking_reference: 'NF7A2B3C9D',
        primary_location: { city: 'London', country: 'United Kingdom', country_code: 'GB' },
        start_date: day(6),
        end_date: day(6),
        total_price: { amount: 84250, currency: 'INR' },
        details: flight,
      }),
    }),
    makeTicketRow(europe.id, {
      document_type: 'hotel',
      title: 'London Marriott Hotel County Hall',
      summary: '4-night stay in a Deluxe King room, booked on Booking.com.',
      provider_name: 'London Marriott Hotel County Hall',
      booking_platform: 'Booking.com',
      booking_reference: '4417882190',
      destination: 'London',
      travel_date: day(6),
      end_date: day(10),
      start_time: '15:00',
      end_time: '11:00',
      file_name: 'Booking.com confirmation.png',
      confidence: 0.93,
      structured_data: envelope('hotel', {
        confidence: 0.93,
        title: 'London Marriott Hotel County Hall',
        summary: '4-night stay in a Deluxe King room, booked on Booking.com.',
        booking_platform: { name: 'Booking.com', domain: 'booking.com' },
        booking_reference: '4417882190',
        primary_location: { city: 'London', country: 'United Kingdom', country_code: 'GB' },
        start_date: day(6),
        end_date: day(10),
        details: hotel,
      }),
    }),
    makeTicketRow(europe.id, {
      document_type: 'train',
      title: 'London → Paris',
      summary: 'Eurostar 9014 in Standard Premier.',
      provider_name: 'Eurostar',
      booking_reference: 'PZK4QW',
      origin: 'London',
      destination: 'Paris',
      travel_date: day(10),
      end_date: day(10),
      start_time: '08:01',
      end_time: '11:20',
      file_name: 'eurostar-PZK4QW.pdf',
      confidence: 0.91,
      structured_data: envelope('train', {
        confidence: 0.91,
        title: 'London → Paris',
        summary: 'Eurostar 9014 in Standard Premier.',
        booking_platform: { name: null, domain: null },
        booking_reference: 'PZK4QW',
        primary_location: { city: 'Paris', country: 'France', country_code: 'FR' },
        start_date: day(10),
        end_date: day(10),
        details: eurostar,
      }),
    }),
    makeTicketRow(europe.id, {
      document_type: 'activity',
      title: 'Musée du Louvre',
      summary: 'Timed entry for 2 at the Louvre.',
      provider_name: 'Louvre Museum',
      booking_reference: 'LV2026883104',
      destination: 'Paris',
      travel_date: day(11),
      start_time: '10:30',
      file_name: 'louvre-tickets.pdf',
      confidence: 0.88,
      structured_data: envelope('activity', {
        confidence: 0.88,
        title: 'Musée du Louvre',
        summary: 'Timed entry for 2 at the Louvre.',
        booking_platform: { name: null, domain: null },
        booking_reference: 'LV2026883104',
        primary_location: { city: 'Paris', country: 'France', country_code: 'FR' },
        start_date: day(11),
        end_date: null,
        details: louvre,
      }),
    }),
    makeTicketRow(europe.id, {
      document_type: 'generic_travel_document',
      title: 'UK Standard Visitor visa',
      summary: 'Multiple-entry UK Standard Visitor visa.',
      provider_name: 'UK Visas and Immigration',
      file_name: 'UK-visa.pdf',
      confidence: 0.64,
      needs_review: true,
      structured_data: envelope('generic_travel_document', {
        confidence: 0.64,
        title: 'UK Standard Visitor visa',
        summary: 'Multiple-entry UK Standard Visitor visa.',
        booking_platform: { name: null, domain: null },
        booking_reference: null,
        primary_location: { city: null, country: 'United Kingdom', country_code: 'GB' },
        start_date: null,
        end_date: day(150),
        details: visa,
      }),
    }),
    makeTicketRow(hyderabad.id, {
      document_type: 'bus',
      title: 'Bengaluru → Hyderabad',
      summary: 'Overnight VRL Volvo sleeper, booked on redBus.',
      provider_name: 'VRL Travels',
      booking_platform: 'redBus',
      booking_reference: 'VRL88213409',
      origin: 'Bengaluru',
      destination: 'Hyderabad',
      travel_date: day(31),
      end_date: day(32),
      start_time: '21:00',
      end_time: '06:30',
      file_name: 'redbus-ticket.jpg',
      confidence: 0.9,
      structured_data: envelope('bus', {
        confidence: 0.9,
        title: 'Bengaluru → Hyderabad',
        summary: 'Overnight VRL Volvo sleeper, booked on redBus.',
        booking_platform: { name: 'redBus', domain: 'redbus.in' },
        booking_reference: 'VRL88213409',
        primary_location: { city: 'Hyderabad', country: 'India', country_code: 'IN' },
        start_date: day(31),
        end_date: day(32),
        details: bus,
      }),
    }),
    makeTicketRow(hyderabad.id, {
      document_type: 'restaurant',
      title: 'Jewel of Nizam',
      summary: 'Dinner for 2.',
      provider_name: 'Jewel of Nizam',
      booking_reference: 'JN4471',
      destination: 'Hyderabad',
      travel_date: day(32),
      start_time: '20:00',
      confidence: 0.86,
      structured_data: envelope('restaurant', {
        confidence: 0.86,
        title: 'Jewel of Nizam',
        summary: 'Dinner for 2.',
        booking_platform: { name: null, domain: null },
        booking_reference: 'JN4471',
        primary_location: { city: 'Hyderabad', country: 'India', country_code: 'IN' },
        start_date: day(32),
        end_date: null,
        details: dinner,
      }),
    }),
    makeTicketRow(chennai.id, {
      document_type: 'train',
      title: 'Bengaluru → Chennai',
      summary: 'Shatabdi Express 12008, AC Chair Car.',
      provider_name: 'Indian Railways',
      booking_reference: '4521876390',
      origin: 'Bengaluru',
      destination: 'Chennai',
      travel_date: day(-41),
      end_date: day(-41),
      start_time: '06:00',
      end_time: '12:45',
      file_name: 'IRCTC-ERS-4521876390.pdf',
      confidence: 0.94,
      structured_data: envelope('train', {
        confidence: 0.94,
        title: 'Bengaluru → Chennai',
        summary: 'Shatabdi Express 12008, AC Chair Car.',
        booking_platform: { name: 'IRCTC', domain: 'irctc.co.in' },
        booking_reference: '4521876390',
        primary_location: { city: 'Chennai', country: 'India', country_code: 'IN' },
        start_date: day(-41),
        end_date: day(-41),
        details: shatabdi,
      }),
    }),
  ]

  return { trips: [europe, hyderabad, chennai], tickets }
}
