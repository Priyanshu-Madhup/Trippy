import { useState } from 'react'
import { cn, hashHue, initials } from '@/lib/utils'

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const hue = hashHue(name)
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 35% 30%), hsl(${(hue + 40) % 360} 50% 55%))`,
      }}
    >
      {initials(name)}
    </span>
  )
}
