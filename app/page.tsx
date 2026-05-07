import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)' }}>SECUREXFER</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login"><button className="btn-g" style={{ fontSize: 11 }}>SIGN IN</button></Link>
          <Link href="/register"><button className="btn-p" style={{ fontSize: 11 }}>GET STARTED</button></Link>
        </div>
      </header>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 32px', maxWidth: 640 }}>
        <div className="tag tag-g" style={{ marginBottom: 32, width: 'fit-content' }}>AES-256-GCM ENCRYPTED</div>
        <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 42, fontWeight: 400, lineHeight: 1.2, marginBottom: 24 }}>
          Secure file transfer.<br />
          <span style={{ color: 'var(--muted)' }}>Zero compromise.</span>
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
          Files are encrypted in your browser before upload. Only you and your recipient hold the key.
          Set expiry times, download limits, and revoke access anytime.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/register"><button className="btn-p" style={{ padding: '12px 28px' }}>START TRANSFERRING →</button></Link>
          <Link href="/login"><button className="btn-g" style={{ padding: '12px 28px' }}>SIGN IN</button></Link>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { h: 'CLIENT-SIDE ENCRYPTION', d: 'AES-256 before upload. Server never sees plaintext.' },
          { h: 'EXPIRY LINKS', d: 'Set time limits and download caps on share links.' },
          { h: 'ZERO KNOWLEDGE', d: 'Keys stay with you. We cannot decrypt your files.' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '28px 32px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <p className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--accent2)', marginBottom: 8 }}>{f.h}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.d}</p>
          </div>
        ))}
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>SECUREXFER v1.0</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>END-TO-END ENCRYPTED</span>
      </footer>
    </main>
  )
}
