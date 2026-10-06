import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { TripFormModal } from '@/components/trips/TripFormModal'
import { UIContext, type UIContextValue } from '@/hooks/useUI'
import { UploadProvider } from '@/hooks/useUpload'
import { enrichMissingVisuals } from '@/services/processing'
import { useInvalidateTripData } from '@/hooks/useTickets'
import { useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import type { Trip } from '@/types'

/** Authenticated app chrome: sidebar (desktop), bottom nav (mobile), global modals. */
export function AppShell() {
  const location = useLocation()
  const [tripModal, setTripModal] = useState<{ open: boolean; trip: Trip | null }>({ open: false, trip: null })

  const ui = useMemo<UIContextValue>(
    () => ({
      openCreateTrip: () => setTripModal({ open: true, trip: null }),
      openEditTrip: (trip) => setTripModal({ open: true, trip }),
    }),
    [],
  )

  useVisualEnrichment()

  // Scroll to top on navigation (but not on hash/search changes).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <UIContext.Provider value={ui}>
      <UploadProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <Sidebar />
          <main id="main" className="min-w-0 flex-1 pb-28 lg:pb-12">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
        <MobileNav />

        <TripFormModal
          open={tripModal.open}
          trip={tripModal.trip}
          onOpenChange={(open) => setTripModal((s) => ({ ...s, open }))}
        />
      </UploadProvider>
    </UIContext.Provider>
  )
}

/**
 * Once per session, resolve logos / photos for rows that don't have them yet
 * (sample data, or uploads that finished while a resolver was down).
 */
function useVisualEnrichment() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTripData()
  useEffect(() => {
    const key = 'trippy.enriched'
    try {
      if (sessionStorage.getItem(key)) return
    } catch {
      /* ignore */
    }
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
      void enrichMissingVisuals()
        .then(async () => {
          await qc.invalidateQueries({ queryKey: qk.trips })
          qc.getQueryCache()
            .findAll({ queryKey: ['tickets', 'trip'] })
            .forEach((q) => invalidate(String(q.queryKey[2])))
        })
        .catch(() => undefined)
    }, 800)
    return () => clearTimeout(timer)
  }, [])
}
