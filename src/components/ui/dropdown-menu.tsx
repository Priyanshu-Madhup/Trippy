import * as Menu from '@radix-ui/react-dropdown-menu'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'menu z-50 min-w-48 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-lift',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({
  className,
  icon,
  children,
  destructive,
  ...props
}: ComponentPropsWithoutRef<typeof Menu.Item> & { icon?: ReactNode; destructive?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted',
        destructive && 'text-danger data-[highlighted]:bg-danger-bg [&_svg]:text-danger',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Menu.Item>
  )
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-line" />
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-3 pb-1.5 pt-2 text-xs text-muted">{children}</Menu.Label>
}
