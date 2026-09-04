import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { api, ApiError } from '../lib/api'
import { PrimaryButton } from '../components/Dialog'
import { InstallHint } from '../components/InstallHint'
import type { AuthProviders, AuthResponse } from '../types'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          prompt: () => void
        }
      }
    }
    AppleID?: {
      auth: {
        init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void
        signIn: () => Promise<{ authorization: { id_token: string } }>
      }
    }
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load sign-in'))
    document.head.appendChild(script)
  })
}

export function LoginPage() {
  const { login, loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const providers = useQuery({ queryKey: ['auth-providers'], queryFn: () => api<AuthProviders>('/api/auth/providers') })

  async function finishOauth(path: string, idToken: string) {
    const response = await api<AuthResponse>(path, { method: 'POST', body: JSON.stringify({ idToken }) })
    loginWithToken(response)
    navigate('/')
  }

  return (
    <AuthFrame title="Welcome Back" subtitle="Measure the stretch. Not the noise.">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            await login(email, password)
            navigate('/')
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not sign in. Check email and password, then try again.')
            emailRef.current?.focus()
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field
          refEl={emailRef}
          label="Email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          type="email"
        />
        <Field
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          type="password"
        />
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <PrimaryButton type="submit" disabled={busy} className="w-full min-h-11 text-sm">
          {busy ? 'Signing in…' : 'Log in'}
        </PrimaryButton>
      </form>
      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />
        OR
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <div className="mt-4 space-y-3">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[var(--accent)]"
          onClick={async () => {
            setError('')
            const clientId = providers.data?.googleClientId
            if (!clientId) {
              setError('Google sign-in needs GOOGLE_CLIENT_ID on the API.')
              return
            }
            try {
              await loadScript('https://accounts.google.com/gsi/client')
              window.google?.accounts.id.initialize({
                client_id: clientId,
                callback: async (response) => {
                  try {
                    await finishOauth('/api/auth/google', response.credential)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Google sign-in failed.')
                  }
                },
              })
              window.google?.accounts.id.prompt()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Google sign-in failed.')
            }
          }}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[var(--fg)]"
          onClick={async () => {
            setError('')
            const clientId = providers.data?.appleClientId
            if (!clientId) {
              setError('Apple sign-in needs APPLE_CLIENT_ID on the API.')
              return
            }
            try {
              await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js')
              window.AppleID?.auth.init({
                clientId,
                scope: 'name email',
                redirectURI: window.location.origin,
                usePopup: true,
              })
              const result = await window.AppleID?.auth.signIn()
              if (!result?.authorization.id_token) throw new Error('Apple did not return a token')
              await finishOauth('/api/auth/apple', result.authorization.id_token)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Apple sign-in failed.')
            }
          }}
        >
          Continue with Apple
        </button>
      </div>
      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        Don't have an account?{' '}
        <Link to="/register" className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)]">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-xs text-[var(--muted)]">Demo workspace: demo@verax.app / verax-demo</p>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  return (
    <AuthFrame title="Begin the Stretch" subtitle="An 8-month record of who you are becoming.">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            await register(name, email, password)
            navigate('/')
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not create the account. Try a different email.')
            nameRef.current?.focus()
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field refEl={nameRef} label="Name" name="name" autoComplete="name" value={name} onChange={setName} />
        <Field
          label="Email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          type="email"
        />
        <Field
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          type="password"
        />
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <PrimaryButton type="submit" disabled={busy} className="w-full min-h-11 text-sm">
          {busy ? 'Creating…' : 'Sign up'}
        </PrimaryButton>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        Have an account?{' '}
        <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)]">
          Log in
        </Link>
      </p>
    </AuthFrame>
  )
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-start justify-center overflow-y-auto bg-[var(--bg)] px-4 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.25rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.25rem))] sm:items-center">
      <div className="grain" aria-hidden="true" />
      <a href="#auth-main" className="skip-link">
        Skip to content
      </a>
      <div id="auth-main" className="relative w-full max-w-[380px]">
        <InstallHint />
      <div className="panel">
        <div className="card px-5 py-8 sm:px-10 sm:py-12">
          <div className="wordmark mb-8 text-center text-5xl leading-none" translate="no">
            Verax
          </div>
          <h1 className="sr-only">{title}</h1>
          <p className="mb-6 text-center text-sm font-medium tracking-wide text-[var(--muted)]">{subtitle}</p>
          {children}
        </div>
      </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  name,
  autoComplete,
  refEl,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  name: string
  autoComplete: string
  refEl?: RefObject<HTMLInputElement | null>
}) {
  const id = `field-${name}`
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-xs tracking-wide text-[var(--muted)]">{label}</span>
      <input
        id={id}
        ref={refEl}
        name={name}
        type={type}
        autoComplete={autoComplete}
        spellCheck={type === 'email' || name === 'email' ? false : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field"
      />
    </label>
  )
}
