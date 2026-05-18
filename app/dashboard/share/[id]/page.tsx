'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatBytes, generateShareToken, generateOtp, hashPassword } from '@/lib/crypto'
import { verifyEmails, canonicalEmail, EmailVerdict } from '@/lib/email-verifier'
import { FileRecord } from '@/types'
import { formatDistanceToNow, addHours, addDays } from 'date-fns'

const verdictTag: Record<EmailVerdict, string> = { valid: 'tag-g', risky: 'tag-a', invalid: 'tag-r' }

export default function ShareSettings() {
  const router = useRouter()
  const params = useParams()
  const id = (params && params.id) ? String(params.id) : ''

  const [file, setFile] = useState<FileRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form state
  const [expiry, setExpiry] = useState('24h')
  const [maxDl, setMaxDl] = useState('')
  const [password, setPassword] = useState('')
  const [recipientsRaw, setRecipientsRaw] = useState('')
  const [useOtp, setUseOtp] = useState(false)
  const [selfDestruct, setSelfDestruct] = useState(false)
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [otp, setOtp] = useState<string | null>(null)

  const recipientResults = useMemo(() => recipientsRaw.trim() ? verifyEmails(recipientsRaw) : [], [recipientsRaw])
  const blockingEmail = recipientResults.find(r => r.verdict === 'invalid')

  useEffect(() => {
    if (!id) return
    createClient().from('files').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setFile(data)
        if (data.share_token) setUrl(`${window.location.origin}/share/${data.share_token}`)
        if (data.share_recipient_emails) setRecipientsRaw((data.share_recipient_emails as string[]).join('\n'))
        if (data.share_message) setMessage(data.share_message)
        if (data.share_otp_code) { setUseOtp(true); setOtp(data.share_otp_code) }
        if (data.share_self_destruct) setSelfDestruct(true)
        if (data.share_max_downloads) setMaxDl(String(data.share_max_downloads))
      }
      setLoading(false)
    })
  }, [id])

  function expDate(v: string): string | null {
    const n = new Date()
    if (v === '1h') return addHours(n, 1).toISOString()
    if (v === '24h') return addHours(n, 24).toISOString()
    if (v === '7d') return addDays(n, 7).toISOString()
    if (v === '30d') return addDays(n, 30).toISOString()
    return null
  }

  async function create() {
    if (!file) return
    if (blockingEmail) { alert(`"${blockingEmail.email}" is invalid — remove or fix it.`); return }
    setSaving(true)
    const token = generateShareToken()
    const exp = expDate(expiry)
    const max = maxDl ? parseInt(maxDl) : null
    const emails = recipientResults.length ? recipientResults.map(r => canonicalEmail(r.email)) : null
    const otpCode = useOtp ? generateOtp() : null
    const pwHash = password ? await hashPassword(password) : null

    const { error } = await createClient().from('files').update({
      share_token: token,
      share_expires_at: exp,
      share_max_downloads: max,
      share_download_count: 0,
      share_view_count: 0,
      share_password_hash: pwHash,
      share_recipient_emails: emails,
      share_otp_code: otpCode,
      share_message: message.trim() || null,
      share_self_destruct: selfDestruct,
    }).eq('id', id)

    if (!error) {
      const u = `${window.location.origin}/share/${token}`
      setUrl(u); setOtp(otpCode)
      setFile(p => p ? {
        ...p, share_token: token, share_expires_at: exp, share_max_downloads: max,
        share_download_count: 0, share_view_count: 0, share_password_hash: pwHash,
        share_recipient_emails: emails, share_otp_code: otpCode,
        share_message: message.trim() || null, share_self_destruct: selfDestruct,
      } : p)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
      setPassword('')
    }
    setSaving(false)
  }

  async function revoke() {
    if (!confirm('Revoke this link?')) return
    await createClient().from('files').update({
      share_token: null, share_expires_at: null, share_max_downloads: null,
      share_password_hash: null, share_recipient_emails: null, share_otp_code: null,
      share_message: null, share_self_destruct: false,
    }).eq('id', id)
    setFile(p => p ? { ...p, share_token: null } : p)
    setUrl(''); setOtp(null)
  }

  if (loading) return <div style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 12 }}><span className="spin" /><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>Loading...</span></div>
  if (!file) return <div style={{ padding: 32 }}><p className="mono" style={{ color: 'var(--red)' }}>File not found.</p></div>

  return (
    <div style={{ padding: 32, maxWidth: 620 }}>
      <button onClick={() => router.push('/dashboard')} className="btn-g" style={{ marginBottom: 24, fontSize: 11 }}>← BACK</button>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>SHARE SETTINGS</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 18, fontWeight: 400, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</h1>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>{formatBytes(file.size)} · {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</p>

      {file.share_token && url ? (
        <div style={{ border: '1px solid var(--border)', padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>ACTIVE SHARE LINK</p>
            <span className="tag tag-g">LIVE</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input readOnly value={url} style={{ flex: 1, fontSize: 11, background: 'var(--raised)', color: 'var(--muted)' }} />
            <button className="btn-g" style={{ flexShrink: 0 }} onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? '✓' : 'COPY'}</button>
            <a href={`mailto:${(file.share_recipient_emails || []).join(',')}?subject=${encodeURIComponent('Secure file: ' + file.original_name)}&body=${encodeURIComponent(`I've shared an encrypted file with you via SecureXfer.\n\n${url}\n\n${otp ? 'Access code (separate channel): ' + otp + '\n\n' : ''}${file.share_message || ''}`)}`}>
              <button className="btn-g" style={{ flexShrink: 0 }}>✉ EMAIL</button>
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              ['DOWNLOADS', `${file.share_download_count}${file.share_max_downloads ? `/${file.share_max_downloads}` : ''}`],
              ['VIEWS', String(file.share_view_count || 0)],
              ['EXPIRES', file.share_expires_at ? formatDistanceToNow(new Date(file.share_expires_at), { addSuffix: true }) : 'Never'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <p className="mono" style={{ fontSize: 9, color: 'var(--dim)', marginBottom: 3 }}>{k}</p>
                <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {file.share_password_hash && <span className="tag tag-b">🔒 PASSWORD</span>}
            {(file.share_recipient_emails?.length ?? 0) > 0 && <span className="tag tag-b">✉ EMAIL-LOCKED · {file.share_recipient_emails!.length}</span>}
            {file.share_otp_code && <span className="tag tag-a">🔑 OTP</span>}
            {file.share_self_destruct && <span className="tag tag-r">⚠ SELF-DESTRUCT</span>}
            {!file.share_password_hash && !file.share_recipient_emails?.length && !file.share_otp_code && !file.share_self_destruct && <span className="tag tag-x">PUBLIC</span>}
          </div>

          {otp && (
            <div style={{ padding: 12, border: '1px solid var(--amber)', background: 'rgba(251,191,36,.05)', marginBottom: 14 }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '0.08em', marginBottom: 4 }}>ONE-TIME ACCESS CODE — SHARE OUT-OF-BAND</p>
              <p className="mono" style={{ fontSize: 22, letterSpacing: '0.2em' }}>{otp}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Send this via Signal / SMS / call. Recipient must enter it to unlock the file.</p>
            </div>
          )}

          <button className="btn-d" style={{ fontSize: 10 }} onClick={revoke}>REVOKE LINK</button>
        </div>
      ) : (
        <div style={{ border: '1px dashed var(--border)', padding: 20, textAlign: 'center', marginBottom: 24 }}>
          <p className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>NO ACTIVE SHARE LINK</p>
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', padding: 20 }}>
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>{file.share_token ? 'REPLACE LINK' : 'CREATE LINK'}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>EXPIRY</label>
            <select value={expiry} onChange={e => setExpiry(e.target.value)}>
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="never">Never</option>
            </select>
          </div>
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>MAX DOWNLOADS <span style={{ color: 'var(--dim)' }}>(blank = ∞)</span></label>
            <input type="number" min="1" placeholder="e.g. 5" value={maxDl} onChange={e => setMaxDl(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>PASSWORD <span style={{ color: 'var(--dim)' }}>(optional — gates download)</span></label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            RECIPIENT EMAILS <span style={{ color: 'var(--dim)' }}>(one per line — only listed addresses can download)</span>
          </label>
          <textarea
            rows={3}
            placeholder={'alice@example.com\nbob@acme.io'}
            value={recipientsRaw}
            onChange={e => setRecipientsRaw(e.target.value)}
            style={{ resize: 'vertical' }}
          />
          {recipientResults.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recipientResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'var(--raised)', border: '1px solid var(--border)' }}>
                  <span className={`tag ${verdictTag[r.verdict]}`} style={{ fontSize: 9 }}>{r.verdict.toUpperCase()}</span>
                  <span className="mono" style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
                  <span className="mono" style={{ fontSize: 10, color: r.score >= 80 ? 'var(--green)' : r.score >= 50 ? 'var(--amber)' : 'var(--red)' }}>{r.score}</span>
                  <span style={{ fontSize: 10, color: 'var(--dim)' }}>{r.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>MESSAGE <span style={{ color: 'var(--dim)' }}>(optional — shown to recipient)</span></label>
          <textarea rows={2} maxLength={500} placeholder="e.g. Q3 financials — please review by Friday" value={message} onChange={e => setMessage(e.target.value)} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={useOtp} onChange={e => setUseOtp(e.target.checked)} style={{ width: 'auto', marginTop: 2 }} />
            <div>
              <p className="mono" style={{ fontSize: 11 }}>REQUIRE 6-DIGIT OTP</p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>One-time access code. Shown to you after creating the link — share out-of-band.</p>
            </div>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={selfDestruct} onChange={e => setSelfDestruct(e.target.checked)} style={{ width: 'auto', marginTop: 2 }} />
            <div>
              <p className="mono" style={{ fontSize: 11 }}>SELF-DESTRUCT AFTER FIRST DOWNLOAD</p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Link auto-revokes once anyone successfully downloads.</p>
            </div>
          </label>
        </div>

        <button className="btn-p" onClick={create} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span className="spin" />}{saving ? 'GENERATING...' : saved ? '✓ CREATED' : '⊗ GENERATE LINK →'}
        </button>
      </div>
    </div>
  )
}
