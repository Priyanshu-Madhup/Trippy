import type { Ticket, TicketPatch, TicketWithTrip } from '@/types'
import { compressImageForUpload, detectMime, isPdfMime, safeFileName } from '@/utils/file'
import { uuid } from '@/lib/utils'
import { backend } from './backend'

export function getTickets(tripId: string): Promise<Ticket[]> {
  return backend.listTickets(tripId)
}

export function getRecentTickets(limit = 6): Promise<TicketWithTrip[]> {
  return backend.listRecentTickets(limit)
}

export function getTicket(id: string): Promise<Ticket | null> {
  return backend.getTicket(id)
}

/** Creates the DB row first (status "uploaded") so the UI can show it immediately. */
export async function createTicketRecord(params: {
  tripId: string
  userId: string
  file: File
}): Promise<{ ticket: Ticket; path: string; mime: string }> {
  const id = uuid()
  const mime = detectMime(params.file)
  const name = safeFileName(params.file.name)
  const path = `${params.userId}/${params.tripId}/${id}/${name}`
  const ticket = await backend.createTicket({
    id,
    trip_id: params.tripId,
    file_path: path,
    file_name: params.file.name,
    file_type: isPdfMime(mime) ? 'pdf' : 'image',
    mime_type: mime,
    file_size: params.file.size,
    processing_status: 'uploaded',
    document_type: 'unknown',
  })
  return { ticket, path, mime }
}

/**
 * Upload pipeline step 1: create the record and store the original file at
 * tickets/{user_id}/{trip_id}/{ticket_id}/{filename}.
 */
export async function uploadTicket(params: {
  tripId: string
  userId: string
  file: File
  onProgress?: (fraction: number) => void
}): Promise<{ ticket: Ticket; file: File }> {
  const file = params.file.type.startsWith('image/') ? await compressImageForUpload(params.file) : params.file
  const { ticket, path } = await createTicketRecord({ tripId: params.tripId, userId: params.userId, file })
  try {
    await backend.uploadFile(path, file, params.onProgress)
  } catch (err) {
    await backend.deleteTicket(ticket.id).catch(() => undefined)
    throw err
  }
  const updated = await backend.updateTicket(ticket.id, { processing_status: 'processing', file_size: file.size })
  return { ticket: updated, file }
}

export function updateTicket(id: string, patch: TicketPatch): Promise<Ticket> {
  return backend.updateTicket(id, patch)
}

/** Deletes the DB row and the stored original. */
export function deleteTicket(id: string): Promise<void> {
  return backend.deleteTicket(id)
}

export function getTicketFileUrl(path: string, options?: { download?: string }): Promise<string> {
  return backend.getFileUrl(path, options)
}

export function downloadTicketFile(path: string): Promise<Blob> {
  return backend.downloadFile(path)
}
