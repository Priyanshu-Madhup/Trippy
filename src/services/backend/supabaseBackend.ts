import type { Session } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { TICKETS_BUCKET, requireSupabase } from '@/lib/supabase'
import { buildSampleData } from '@/demo/sampleData'
import type { Profile, Ticket, TicketWithTrip, Trip, TripPlace, TripWithStats } from '@/types'
import type { AuthSession, Backend } from './types'

const sb = () => requireSupabase()

function toSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null
  const meta = session.user.user_metadata as { name?: string } | undefined
  return { user: { id: session.user.id, email: session.user.email ?? null, name: meta?.name ?? null } }
}

async function userId(): Promise<string> {
  const { data } = await sb().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('You need to be signed in.')
  return id
}

function fail(error: { message: string } | null, fallback = 'Something went wrong.'): never | void {
  if (error) throw new Error(error.message || fallback)
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email address first — check your inbox.'
  if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Try signing in.'
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a moment and try again.'
  return message
}

const TICKET_COLUMNS = '*'

export const supabaseBackend: Backend = {
  kind: 'supabase',

  // ─── Auth ─────────────────────────────────────────────────────────
  async getSession() {
    const { data } = await sb().auth.getSession()
    return toSession(data.session)
  },

  onAuthChange(cb) {
    const { data } = sb().auth.onAuthStateChange((_event, session) => cb(toSession(session)))
    return () => data.subscription.unsubscribe()
  },

  async signIn(email, password) {
    const { data, error } = await sb().auth.signInWithPassword({ email, password })
    if (error) throw new Error(friendlyAuthError(error.message))
    const session = toSession(data.session)
    if (!session) throw new Error('Could not start a session.')
    return session
  },

  async signUp(name, email, password) {
    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${window.location.origin}/app` },
    })
    if (error) throw new Error(friendlyAuthError(error.message))
    // Supabase returns a user with no identities when the email is already taken.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('An account with this email already exists. Try signing in.')
    }
    const session = toSession(data.session)
    return { session, needsConfirmation: !session }
  },

  async signOut() {
    await sb().auth.signOut()
  },

  async getAccessToken() {
    const { data } = await sb().auth.getSession()
    return data.session?.access_token ?? null
  },

  // ─── Profile ──────────────────────────────────────────────────────
  async getProfile() {
    const id = await userId()
    const { data, error } = await sb().from('profiles').select('*').eq('id', id).maybeSingle()
    fail(error)
    if (data) return data as Profile
    // Profile row is normally created by a DB trigger — create it if missing.
    const { data: auth } = await sb().auth.getUser()
    const meta = auth.user?.user_metadata as { name?: string } | undefined
    const { data: created, error: insertError } = await sb()
      .from('profiles')
      .upsert({ id, email: auth.user?.email ?? null, name: meta?.name ?? null })
      .select('*')
      .single()
    fail(insertError)
    return created as Profile
  },

  async updateProfile(patch) {
    const id = await userId()
    const { data, error } = await sb().from('profiles').update(patch).eq('id', id).select('*').single()
    fail(error)
    if (patch.name) await sb().auth.updateUser({ data: { name: patch.name } })
    return data as Profile
  },

  async getStats() {
    const [trips, tickets] = await Promise.all([
      sb().from('trips').select('id', { count: 'exact', head: true }),
      sb().from('tickets').select('file_size, file_path'),
    ])
    fail(trips.error)
    fail(tickets.error)
    const rows = (tickets.data ?? []) as { file_size: number | null; file_path: string | null }[]
    return {
      trips: trips.count ?? 0,
      tickets: rows.length,
      documents: rows.filter((r) => r.file_path).length,
      storageBytes: rows.reduce((sum, r) => sum + (r.file_size ?? 0), 0),
    }
  },

  // ─── Trips ────────────────────────────────────────────────────────
  async listTrips() {
    const { data, error } = await sb()
      .from('trips')
      .select('*, tickets(id, document_type, processing_status)')
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    fail(error)
    return (data ?? []) as TripWithStats[]
  },

  async getTrip(id) {
    const { data, error } = await sb().from('trips').select('*').eq('id', id).maybeSingle()
    fail(error)
    return (data as Trip | null) ?? null
  },

  async createTrip(input) {
    const user_id = await userId()
    const { data, error } = await sb()
      .from('trips')
      .insert({ ...input, user_id })
      .select('*')
      .single()
    fail(error)
    return data as Trip
  },

  async updateTrip(id, patch) {
    const { data, error } = await sb().from('trips').update(patch).eq('id', id).select('*').single()
    fail(error)
    return data as Trip
  },

  async deleteTrip(id) {
    const { data: files } = await sb().from('tickets').select('file_path').eq('trip_id', id)
    const paths = ((files ?? []) as { file_path: string | null }[]).map((f) => f.file_path).filter((p): p is string => !!p)
    const { error } = await sb().from('trips').delete().eq('id', id)
    fail(error)
    if (paths.length) await sb().storage.from(TICKETS_BUCKET).remove(paths)
  },

  // ─── Tickets ──────────────────────────────────────────────────────
  async listTickets(tripId) {
    const { data, error } = await sb()
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('trip_id', tripId)
      .order('travel_date', { ascending: true, nullsFirst: false })
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    fail(error)
    return (data ?? []) as Ticket[]
  },

  async listRecentTickets(limit) {
    const { data, error } = await sb()
      .from('tickets')
      .select('*, trip:trips(id, name, destination)')
      .order('created_at', { ascending: false })
      .limit(limit)
    fail(error)
    return (data ?? []) as TicketWithTrip[]
  },

  async getTicket(id) {
    const { data, error } = await sb().from('tickets').select(TICKET_COLUMNS).eq('id', id).maybeSingle()
    fail(error)
    return (data as Ticket | null) ?? null
  },

  async createTicket(row) {
    const user_id = await userId()
    const { data, error } = await sb()
      .from('tickets')
      .insert({ ...row, user_id })
      .select(TICKET_COLUMNS)
      .single()
    fail(error)
    return data as Ticket
  },

  async updateTicket(id, patch) {
    const { data, error } = await sb().from('tickets').update(patch).eq('id', id).select(TICKET_COLUMNS).single()
    fail(error)
    return data as Ticket
  },

  async deleteTicket(id) {
    const { data } = await sb().from('tickets').select('file_path').eq('id', id).maybeSingle()
    const { error } = await sb().from('tickets').delete().eq('id', id)
    fail(error)
    const path = (data as { file_path: string | null } | null)?.file_path
    if (path) await sb().storage.from(TICKETS_BUCKET).remove([path])
  },

  // ─── Places ───────────────────────────────────────────────────────
  async listPlaces(tripId) {
    const { data, error } = await sb().from('trip_places').select('*').eq('trip_id', tripId).order('created_at')
    fail(error)
    return (data ?? []) as TripPlace[]
  },

  async addPlaces(tripId, places) {
    if (places.length === 0) return
    const user_id = await userId()
    const { error } = await sb()
      .from('trip_places')
      .upsert(
        places.map((p) => ({ ...p, trip_id: tripId, user_id })),
        { onConflict: 'trip_id,place_name,place_type', ignoreDuplicates: true },
      )
    fail(error)
  },

  // ─── Files ────────────────────────────────────────────────────────
  async uploadFile(path, file, onProgress) {
    const { data } = await sb().auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('You need to be signed in.')
    const encoded = path.split('/').map(encodeURIComponent).join('/')

    // XHR instead of supabase-js so we can report real upload progress.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${env.supabaseUrl}/storage/v1/object/${TICKETS_BUCKET}/${encoded}`)
      xhr.setRequestHeader('authorization', `Bearer ${token}`)
      xhr.setRequestHeader('apikey', env.supabaseAnonKey)
      xhr.setRequestHeader('content-type', file.type || 'application/octet-stream')
      xhr.setRequestHeader('cache-control', 'max-age=3600')
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve()
        let message = 'Upload failed.'
        try {
          message = (JSON.parse(xhr.responseText) as { message?: string }).message ?? message
        } catch {
          /* non-JSON error */
        }
        reject(new Error(message))
      }
      xhr.onerror = () => reject(new Error('Network error while uploading.'))
      xhr.send(file)
    })
    onProgress?.(1)
  },

  async getFileUrl(path, options) {
    const { data, error } = await sb()
      .storage.from(TICKETS_BUCKET)
      .createSignedUrl(path, 60 * 60, options?.download ? { download: options.download } : undefined)
    fail(error)
    if (!data?.signedUrl) throw new Error('Could not open this file.')
    return data.signedUrl
  },

  async downloadFile(path) {
    const { data, error } = await sb().storage.from(TICKETS_BUCKET).download(path)
    fail(error)
    if (!data) throw new Error('Could not download this file.')
    return data
  },

  async removeFiles(paths) {
    if (paths.length) await sb().storage.from(TICKETS_BUCKET).remove(paths)
  },

  // ─── Realtime ─────────────────────────────────────────────────────
  subscribeToTrip(tripId, onChange) {
    const channel = sb()
      .channel(`trip-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `trip_id=eq.${tripId}` }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, onChange)
      .subscribe()
    return () => {
      void sb().removeChannel(channel)
    }
  },

  // ─── Sample data ──────────────────────────────────────────────────
  async seedSampleData() {
    const uid = await userId()
    const sample = buildSampleData(uid)
    const { data: trips, error } = await sb()
      .from('trips')
      .insert(sample.trips.map(({ id, ...t }) => ({ ...t, id, user_id: uid })))
      .select('*')
    fail(error)
    const { error: ticketError } = await sb()
      .from('tickets')
      .insert(sample.tickets.map((t) => ({ ...t, user_id: uid })))
    fail(ticketError)
    return (trips ?? []) as Trip[]
  },

  async removeSampleData() {
    const { error } = await sb().from('trips').delete().eq('is_demo', true)
    fail(error)
  },
}
