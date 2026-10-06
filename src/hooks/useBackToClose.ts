import { useEffect, useRef } from 'react'

let counter = 0

/**
 * Makes the phone/browser back button close an overlay (viewer, dialog, sheet)
 * instead of navigating away: while `open`, an extra history entry sits on
 * top; "back" pops it and closes the overlay. Closing the overlay any other
 * way removes that entry again so history stays clean.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const id = ++counter
    window.history.pushState({ ...(window.history.state ?? {}), __overlay: id }, '')
    let popped = false
    const onPop = () => {
      popped = true
      close.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (popped) return
      // Deferred so a navigation triggered by the overlay (or a StrictMode
      // re-mount) can take over the top entry first.
      setTimeout(() => {
        if ((window.history.state as { __overlay?: number } | null)?.__overlay === id) window.history.back()
      }, 0)
    }
  }, [open])
}
