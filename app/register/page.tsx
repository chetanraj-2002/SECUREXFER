'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (pw !== pw2) { setErr('Passwords do not match'); return }
    if (pw.length < 6) { setErr('Password must be at least 6 characters'); return }
    setBusy(true)
    const sb = createClient()
    const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { display_name: name } } })
    if (error) { setErr(error.message); setBusy(false); return }
    if (data.user) await sb.from('profiles').upsert({ id: data.user.id, email, display_name: name })
    setDone(true)
  }

  if (done) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span className="mono" style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)' }}>SECUREXFER</span></Link>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div className="tag tag-g" style={{ margin: '0 auto 20px', width: 'fit-content' }}>ACCOUNT CREATED</div>
          <h2 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 20, fontWeight: 400, marginBottom: 12 }}>You&apos;re registered!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Account ready for <span className="mono" style={{ color: 'var(--text)' }}>{email}</span></p>
          <Link href="/login"><button className="btn-p">GO TO SIGN IN →</button></Link>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span className="mono" style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)' }}>SECUREXFER</span></Link>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>CREATE ACCOUNT</p>
          <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 24, fontWeight: 400, marginBottom: 28 }}>Register</h1>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'DISPLAY NAME', type: 'text', val: name, set: setName, ph: 'Your name' },
              { label: 'EMAIL', type: 'email', val: email, set: setEmail, ph: 'user@example.com' },
              { label: 'PASSWORD', type: 'password', val: pw, set: setPw, ph: '••••••••' },
              { label: 'CONFIRM PASSWORD', type: 'password', val: pw2, set: setPw2, ph: '••••••••' },
            ].map(f => (
              <div key={f.label}>
                <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} required />
              </div>
            ))}
            {err && <div style={{ padding: '10px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--red-d)' }}><p className="mono" style={{ fontSize: 12, color: 'var(--red)' }}>{err}</p></div>}
            <button type="submit" className="btn-p" disabled={busy} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy && <span className="spin" />}{busy ? 'CREATING...' : 'CREATE ACCOUNT →'}
            </button>
          </form>
          <div className="divider" style={{ margin: '24px 0' }} />
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Have an account? <Link href="/login" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Sign in</Link></p>
        </div>
      </div>
    </main>
  )
}
