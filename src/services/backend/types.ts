import type {
  CreateTripInput,
  NewTicket,
  Profile,
  Ticket,
  TicketPatch,
  TicketWithTrip,
  Trip,
  TripPatch,
  TripPlace,
  TripWithStats,
} from '@/types'

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
}

export interface AuthSession {
  user: AuthUser
}

export interface UsageStats {
  trips: number
  tickets: number
  documents: number
  storageBytes: number
}

export interface PlaceInput {
  place_name: string
  place_type: TripPlace['place_type']
  ticket_id?: string | null
  image_url?: string | null
  source?: string | null
}

/**
 * Everything the UI needs from persistence. Implemented by Supabase (production)
 * and by a browser-local store (demo mode). UI code never talks to either directly.
 */
export interface Backend {
  kind: 'supabase' | 'demo'

  // Auth
  getSession(): Promise<AuthSession | null>
  onAuthChange(cb: (session: AuthSession | null) => void): () => void
  signIn(email: string, password: string): Promise<AuthSession>
  signUp(name: string, email: string, password: string): Promise<{ session: AuthSession | null; needsConfirmation: boolean }>
  signOut(): Promise<void>
  getAccessToken(): Promise<string | null>

  // Profile
  getProfile(): Promise<Profile>
  updateProfile(patch: Partial<Pick<Profile, 'name' | 'avatar_url' | 'preferences'>>): Promise<Profile>
  getStats(): Promise<UsageStats>

  // Trips
  listTrips(): Promise<TripWithStats[]>
  getTrip(id: string): Promise<Trip | null>
  createTrip(input: CreateTripInput & TripPatch): Promise<Trip>
  updateTrip(id: string, patch: TripPatch): Promise<Trip>
  deleteTrip(id: string): Promise<void>

  // Tickets
  listTickets(tripId: string): Promise<Ticket[]>
  listRecentTickets(limit: number): Promise<TicketWithTrip[]>
  getTicket(id: string): Promise<Ticket | null>
  createTicket(row: NewTicket): Promise<Ticket>
  updateTicket(id: string, patch: TicketPatch): Promise<Ticket>
  deleteTicket(id: string): Promise<void>

  // Places
  listPlaces(tripId: string): Promise<TripPlace[]>
  addPlaces(tripId: string, places: PlaceInput[]): Promise<void>

  // Files
  uploadFile(path: string, file: Blob, onProgress?: (fraction: number) => void): Promise<void>
  getFileUrl(path: string, options?: { download?: string }): Promise<string>
  downloadFile(path: string): Promise<Blob>
  removeFiles(paths: string[]): Promise<void>

  // Realtime — returns an unsubscribe function
  subscribeToTrip(tripId: string, onChange: () => void): () => void

  // Sample data (clearly flagged with is_demo = true)
  seedSampleData(): Promise<Trip[]>
  removeSampleData(): Promise<void>
}
