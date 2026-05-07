'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setErr(error.message); setBusy(false) }
    else router.push('/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="mono" style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)' }}>SECUREXFER</span>
        </Link>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>AUTHENTICATION</p>
          <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 24, fontWeight: 400, marginBottom: 28 }}>Sign in</h1>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {err && <div style={{ padding: '10px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--red-d)' }}><p className="mono" style={{ fontSize: 12, color: 'var(--red)' }}>{err}</p></div>}
            <button type="submit" className="btn-p" disabled={busy} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy && <span className="spin" />}{busy ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>
          <div className="divider" style={{ margin: '24px 0' }} />
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>No account? <Link href="/register" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Register</Link></p>
        </div>
      </div>
    </main>
  )
}
