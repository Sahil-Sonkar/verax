import { clsx } from 'clsx'

export function VeraxMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx('shrink-0', className)} aria-hidden="true">
      <path d="M7.2 6.4h7.4L18.4 25.6H9.6L7.2 6.4z" fill="currentColor" opacity="0.92" />
      <path d="M16.4 6.4h8.4L22.4 25.6h-8.6L16.4 6.4z" fill="currentColor" opacity="0.48" />
    </svg>
  )
}

export function VeraxWordmark({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg'
}) {
  const type = size === 'lg' ? 'text-[40px]' : size === 'sm' ? 'text-[28px]' : 'text-[32px]'
  const mark = size === 'lg' ? 'size-9' : size === 'sm' ? 'size-7' : 'size-8'
  return (
    <span className={clsx('inline-flex items-center gap-2 leading-none text-[var(--accent)]', type)} translate="no">
      <VeraxMark className={mark} />
      <span className="wordmark text-[var(--fg)]">Verax</span>
    </span>
  )
}
