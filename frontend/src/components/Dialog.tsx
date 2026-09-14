import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Glyph } from './Glyph'
import { ChevronLeft, X } from 'lucide'

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

  return (
    <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4" style={{ zIndex: 40 + layer * 10 }}>
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,#000_42%,transparent)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="sheet relative max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)))] w-full max-w-lg overflow-y-auto rounded-b-none p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[20px]"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="sticky top-0 z-[1] -mx-2 -mt-1 mb-2 flex items-center gap-1 bg-[var(--surface)]">
          {onBack ? (
            <button type="button" className="grid size-10 shrink-0 place-items-center" aria-label="Back" onClick={onBack}>
              <Glyph icon={ChevronLeft} size={22} />
            </button>
          ) : null}
          <h2 id="dialog-title" className={cn('min-w-0 flex-1 text-base font-semibold', onBack && 'text-center')}>
            {title}
          </h2>
          {action}
          <button type="button" className="grid size-10 shrink-0 place-items-center" aria-label="Close" onClick={onClose}>
            <Glyph icon={X} size={22} />
          </button>
        </div>
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
