import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { api, ApiError } from '../lib/api'
import { PrimaryButton } from '../components/Dialog'
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
  const [email, setEmail] = useState('demo@verax.app')
  const [password, setPassword] = useState('verax-demo')
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
        <PrimaryButton type="submit" disabled={busy} className="w-full py-3 font-medium">
          {busy ? 'Signing in…' : 'Enter Verax'}
        </PrimaryButton>
      </form>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          className="glass-btn w-full py-2.5 text-sm"
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
          className="glass-btn w-full py-2.5 text-sm"
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
      <p className="mt-6 text-sm text-[var(--muted)]">
        New here?{' '}
        <Link to="/register" className="text-[var(--fg)] underline-offset-4 hover:underline">
          Create an Account
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
        <PrimaryButton type="submit" disabled={busy} className="w-full py-3 font-medium">
          {busy ? 'Creating…' : 'Create Account'}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have a workspace?{' '}
        <Link to="/login" className="text-[var(--fg)] underline-offset-4 hover:underline">
          Sign In
        </Link>
      </p>
    </AuthFrame>
  )
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <a href="#auth-main" className="skip-link">
        Skip to content
      </a>
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--line)] px-16 py-16 lg:flex">
        <div className="pointer-events-none absolute -left-20 -top-24 size-80 rounded-full bg-[var(--violet)]/35 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 size-72 rounded-full bg-[var(--sky)]/28 blur-3xl" />
        <div className="wordmark relative text-6xl font-medium tracking-tight" translate="no">
          Verax
        </div>
        <p className="max-w-sm text-3xl leading-snug tracking-tight">
          Am I consistently becoming the person I want to become?
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
          Plan, do, track, analyze, improve.
        </p>
      </div>
      <div id="auth-main" className="relative flex items-center px-6 py-16">
        <div className="pointer-events-none absolute -right-16 top-10 size-72 rounded-full bg-[var(--sky)]/20 blur-3xl" />
        <div className="glass relative mx-auto w-full max-w-md p-8">
          <div className="wordmark mb-10 text-4xl font-medium tracking-tight lg:hidden" translate="no">
            Verax
          </div>
          <h1 className="text-4xl tracking-tight">{title}</h1>
          <p className="mt-2 mb-8 max-w-[65ch] text-[var(--muted)]">{subtitle}</p>
          {children}
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
