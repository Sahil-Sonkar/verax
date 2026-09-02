export function applyTheme(mode: 'light' | 'dark') {
  const root = document.documentElement
  const freeze = document.createElement('style')
  freeze.appendChild(document.createTextNode('*,*::before,*::after{transition:none !important}'))
  document.head.appendChild(freeze)
  root.classList.toggle('light', mode === 'light')
  root.classList.toggle('dark', mode === 'dark')
  localStorage.setItem('verax.theme', mode)
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (meta) meta.setAttribute('content', mode === 'light' ? '#f6f5f2' : '#0c0c0b')
  void root.offsetHeight
  freeze.remove()
}
