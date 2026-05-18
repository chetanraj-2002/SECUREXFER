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

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 32px', maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          <div className="tag tag-g">AES-256-GCM</div>
          <div className="tag tag-b">EMAIL-LOCKED SHARES</div>
          <div className="tag tag-a">OTP &amp; PASSWORD GATES</div>
        </div>
        <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 42, fontWeight: 400, lineHeight: 1.2, marginBottom: 24 }}>
          Secure file transfer.<br />
          <span style={{ color: 'var(--muted)' }}>Zero compromise.</span>
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 40, maxWidth: 540 }}>
          Files are encrypted in your browser before upload. Lock shares to verified recipient emails,
          add password &amp; OTP gates, set expiry / download caps, and watch every access in a live audit log.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/register"><button className="btn-p" style={{ padding: '12px 28px' }}>START TRANSFERRING →</button></Link>
          <Link href="/login"><button className="btn-g" style={{ padding: '12px 28px' }}>SIGN IN</button></Link>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { h: 'CLIENT-SIDE ENCRYPTION', d: 'AES-256-GCM in the browser. Server never sees plaintext.' },
          { h: 'EMAIL VERIFIER', d: 'Built-in syntax / disposable / typo checks scoring every recipient.' },
          { h: 'GATED SHARES', d: 'Lock by email, password, 6-digit OTP, expiry, or one-shot self-destruct.' },
          { h: 'LIVE AUDIT LOG', d: 'Every download attempt — success or denied — is recorded for you.' },
          { h: 'BULK UPLOAD', d: 'Encrypt and queue multiple files at once. Same E2E guarantees.' },
          { h: 'ZERO KNOWLEDGE', d: 'Keys stay client-side. We cannot decrypt your files even if asked.' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '24px 28px', borderRight: (i % 3) < 2 ? '1px solid var(--border)' : 'none', borderTop: i >= 3 ? '1px solid var(--border)' : 'none' }}>
            <p className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--accent2)', marginBottom: 8 }}>{f.h}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.d}</p>
          </div>
        ))}
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>SECUREXFER v1.1</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>END-TO-END ENCRYPTED</span>
      </footer>
    </main>
  )
}
