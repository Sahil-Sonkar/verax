import { useEffect, useState } from 'react'

const KEY = 'verax.installHint'

function isIosSafari() {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return ios && !standalone
}

export function InstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isIosSafari() && localStorage.getItem(KEY) !== 'hide') setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="mx-auto mb-4 flex max-w-[380px] items-start gap-3 rounded-[14px] bg-[var(--surface)] px-3 py-3 text-sm shadow-[var(--shadow-border)]">
      <p className="min-w-0 flex-1 text-[var(--muted)]">
        On iPhone: tap Share, then <span className="font-medium text-[var(--fg)]">Add to Home Screen</span>. Verax opens like an app and picks up site updates when you launch it.
      </p>
      <button
        type="button"
        className="shrink-0 text-xs font-semibold"
        onClick={() => {
          localStorage.setItem(KEY, 'hide')
          setShow(false)
        }}
      >
        OK
      </button>
    </div>
  )
}
