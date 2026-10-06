import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { qk } from '@/lib/queryClient'
import { createAutoTrip } from '@/services/trips'
import { validateFile } from '@/utils/file'
import { useUploads } from './useUpload'

/**
 * Upload with zero typing: creates a trip, uploads the files into it and opens
 * it. The AI then fills in the name, destination, dates and cover photo.
 */
export function useStartTripFromFiles() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { enqueue } = useUploads()
  const [pending, setPending] = useState(false)

  async function start(files: File[]) {
    if (!files.some((f) => !validateFile(f))) {
      files.forEach((f) => toast.error(validateFile(f)))
      return
    }
    setPending(true)
    try {
      const trip = await createAutoTrip()
      qc.setQueryData(qk.trip(trip.id), trip)
      void qc.invalidateQueries({ queryKey: qk.trips })
      enqueue(trip.id, files)
      navigate(`/app/trip/${trip.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start a new trip.')
    } finally {
      setPending(false)
    }
  }

  return { start, pending }
}
