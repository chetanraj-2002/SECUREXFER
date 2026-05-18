'use client'
import { useMemo, useState } from 'react'
import { verifyEmails, EmailVerificationResult, EmailVerdict } from '@/lib/email-verifier'

const verdictTag: Record<EmailVerdict, string> = { valid: 'tag-g', risky: 'tag-a', invalid: 'tag-r' }
const verdictLabel: Record<EmailVerdict, string> = { valid: 'VALID', risky: 'RISKY', invalid: 'INVALID' }

export default function EmailVerify() {
  const [input, setInput] = useState('')
  const [committed, setCommitted] = useState('')
  const results = useMemo<EmailVerificationResult[]>(() => committed ? verifyEmails(committed) : [], [committed])

  const summary = useMemo(() => {
    const s = { valid: 0, risky: 0, invalid: 0 }
    for (const r of results) s[r.verdict]++
    return s
  }, [results])

  function run() { setCommitted(input) }
  function loadExample() {
    setInput('alice@gmail.com\nbob@mailinator.com\nsupport@acme.io\ncharlie@gmial.com\ndave+promo@gmail.com\nmalformed@@')
  }
  function exportCsv() {
    const head = 'email,verdict,score,reason,disposable,free_provider,role_account,suggestion'
    const rows = results.map(r => [
      r.email, r.verdict, r.score, r.reason,
      r.is_disposable, r.is_free_provider, r.is_role_account, r.suggestion ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([head + '\n' + rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'email-verification.csv'; a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ padding: 32, maxWidth: 880 }}>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>VERIFICATION TOOL</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Email Verifier</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Validate syntax, detect disposable / role / typo addresses, and risk-score recipients before
        wiring them to a share link. Runs entirely client-side — no addresses leave your browser.
      </p>

      <div style={{ border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>EMAILS (one per line, or comma/semicolon separated)</label>
          <button className="btn-g" style={{ fontSize: 10 }} onClick={loadExample}>LOAD SAMPLE</button>
        </div>
        <textarea
          rows={6}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={'alice@example.com\nbob@mailinator.com\nsupport@acme.io'}
          style={{ resize: 'vertical', minHeight: 110 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn-p" onClick={run} disabled={!input.trim()}>▶ VERIFY {input.trim().split(/[\s,;\n]+/).filter(Boolean).length || ''}</button>
          <button className="btn-g" onClick={() => { setInput(''); setCommitted('') }}>CLEAR</button>
          {results.length > 0 && <button className="btn-g" onClick={exportCsv}>↓ EXPORT CSV</button>}
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 20 }}>
            {[
              ['CHECKED', String(results.length), 'var(--accent)'],
              ['VALID', String(summary.valid), 'var(--green)'],
              ['RISKY', String(summary.risky), 'var(--amber)'],
              ['INVALID', String(summary.invalid), 'var(--red)'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--surface)', padding: '14px 18px' }}>
                <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 4 }}>{l}</p>
                <p className="mono" style={{ fontSize: 20, color: c as string }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r, i) => (
              <details key={i} className="card ani" style={{ padding: 0 }}>
                <summary style={{ listStyle: 'none', cursor: 'pointer', padding: 16, display: 'grid', gridTemplateColumns: '90px 1fr 70px 70px', alignItems: 'center', gap: 12 }}>
                  <span className={`tag ${verdictTag[r.verdict]}`} style={{ justifyContent: 'center' }}>{verdictLabel[r.verdict]}</span>
                  <div style={{ overflow: 'hidden' }}>
                    <p className="mono" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email || '(empty)'}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono" style={{ fontSize: 9, color: 'var(--dim)' }}>SCORE</p>
                    <p className="mono" style={{ fontSize: 15, color: r.score >= 80 ? 'var(--green)' : r.score >= 50 ? 'var(--amber)' : 'var(--red)' }}>{r.score}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono" style={{ fontSize: 9, color: 'var(--dim)' }}>DETAILS</p>
                    <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>▾</p>
                  </div>
                </summary>
                <div style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--raised)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                    {[
                      ['LOCAL', r.local || '—'],
                      ['DOMAIN', r.domain || '—'],
                      ['CLASS', r.is_role_account ? 'Role mailbox' : r.is_disposable ? 'Disposable' : r.is_free_provider ? 'Free webmail' : r.domain ? 'Business' : '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <p className="mono" style={{ fontSize: 9, color: 'var(--dim)', marginBottom: 3 }}>{k}</p>
                        <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {r.checks.map((c, j) => (
                      <div key={j} style={{ display: 'grid', gridTemplateColumns: '20px 200px 1fr', alignItems: 'center', padding: '4px 0' }}>
                        <span className="mono" style={{ fontSize: 12, color: c.pass ? 'var(--green)' : 'var(--red)' }}>{c.pass ? '✓' : '✗'}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--dim)' }}>{c.note}</span>
                      </div>
                    ))}
                  </div>
                  {r.suggestion && (
                    <div style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <p className="mono" style={{ fontSize: 11, color: 'var(--amber)' }}>SUGGESTION → {r.local || '?'}@{r.suggestion}</p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </>
      )}

      {!results.length && (
        <div style={{ border: '1px dashed var(--border)', padding: 48, textAlign: 'center' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>PASTE EMAILS ABOVE TO VERIFY</p>
        </div>
      )}
    </div>
  )
}
