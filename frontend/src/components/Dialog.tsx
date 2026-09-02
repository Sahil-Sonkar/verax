import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Glyph } from './Glyph'
import { ChevronLeft } from 'lucide'

export function Dialog({
  title,
  children,
  onClose,
  onBack,
  action,
  layer = 1,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onBack?: () => void
  action?: ReactNode
  layer?: number
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') (onBack ?? onClose)()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onBack, onClose])

  const stacked = onBack != null || action != null

  return (
    <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center" style={{ zIndex: 40 + layer * 10 }}>
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--fg)_42%,transparent)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="sheet relative max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)))] w-full max-w-lg overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ overscrollBehavior: 'contain' }}
      >
        {stacked ? (
          <div className="-mx-2 mb-2 flex items-center gap-1">
            {onBack ? (
              <button type="button" className="grid size-10 place-items-center" aria-label="Back" onClick={onBack}>
                <Glyph icon={ChevronLeft} size={22} />
              </button>
            ) : (
              <span className="size-10" />
            )}
            <h2 id="dialog-title" className="min-w-0 flex-1 text-center text-base font-semibold">
              {title}
            </h2>
            {action ?? <span className="size-10" />}
          </div>
        ) : (
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}

export function PrimaryButton({
  children,
  disabled,
  type = 'button',
  className = '',
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  onClick?: () => void
}) {
  return (
    <Button type={type} disabled={disabled} onClick={onClick} className={cn('glass-primary', className)}>
      {children}
    </Button>
  )
}
