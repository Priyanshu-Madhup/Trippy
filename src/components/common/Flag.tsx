import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Country flag as an image — emoji flags don't render on Windows.
 * Hides itself if the image can't load.
 */
export function Flag({ code, className }: { code: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!code || !/^[A-Za-z]{2}$/.test(code) || failed) return null
  const cc = code.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      srcSet={`https://flagcdn.com/w80/${cc}.png 2x`}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('inline-block h-[0.72em] w-auto shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.12)]', className)}
    />
  )
}
