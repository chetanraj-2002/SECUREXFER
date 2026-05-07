'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatBytes, generateShareToken } from '@/lib/crypto'
import { FileRecord } from '@/types'
import { formatDistanceToNow, addHours, addDays } from 'date-fns'

export default function ShareSettings() {
  const router = useRouter()
  const params = useParams()
  const id = (params && params.id) ? String(params.id) : ''

  const [file, setFile] = useState<FileRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiry, setExpiry] = useState('24h')
  const [maxDl, setMaxDl] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!id) return
    createClient().from('files').select('*').eq('id', id).single().then(({ data }) => {
      if (data) { setFile(data); if (data.share_token) setUrl(`${window.location.origin}/share/${data.share_token}`) }
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
    setSaving(true)
    const token = generateShareToken()
    const exp = expDate(expiry)
    const max = maxDl ? parseInt(maxDl) : null
    const { error } = await createClient().from('files').update({ share_token: token, share_expires_at: exp, share_max_downloads: max, share_download_count: 0 }).eq('id', id)
    if (!error) {
      const u = `${window.location.origin}/share/${token}`
      setUrl(u)
      setFile(p => p ? { ...p, share_token: token, share_expires_at: exp, share_max_downloads: max, share_download_count: 0 } : p)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function revoke() {
    if (!confirm('Revoke this link?')) return
    await createClient().from('files').update({ share_token: null, share_expires_at: null, share_max_downloads: null }).eq('id', id)
    setFile(p => p ? { ...p, share_token: null } : p); setUrl('')
  }

  if (loading) return <div style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 12 }}><span className="spin" /><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>Loading...</span></div>
  if (!file) return <div style={{ padding: 32 }}><p className="mono" style={{ color: 'var(--red)' }}>File not found.</p></div>

  return (
    <div style={{ padding: 32, maxWidth: 540 }}>
      <button onClick={() => router.push('/dashboard')} className="btn-g" style={{ marginBottom: 24, fontSize: 11 }}>← BACK</button>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>SHARE SETTINGS</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 18, fontWeight: 400, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</h1>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 28 }}>{formatBytes(file.size)} · {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</p>

      {file.share_token && url ? (
        <div style={{ border: '1px solid var(--border)', padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>ACTIVE SHARE LINK</p>
            <span className="tag tag-g">LIVE</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input readOnly value={url} style={{ flex: 1, fontSize: 11, background: 'var(--raised)', color: 'var(--muted)' }} />
            <button className="btn-g" style={{ flexShrink: 0 }} onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? '✓' : 'COPY'}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              ['DOWNLOADS', `${file.share_download_count}${file.share_max_downloads ? `/${file.share_max_downloads}` : ''}`],
              ['EXPIRES', file.share_expires_at ? formatDistanceToNow(new Date(file.share_expires_at), { addSuffix: true }) : 'Never'],
              ['TOKEN', `...${file.share_token.slice(-8)}`],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <p className="mono" style={{ fontSize: 9, color: 'var(--dim)', marginBottom: 3 }}>{k}</p>
                <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{v}</p>
              </div>
            ))}
          </div>
          <button className="btn-d" style={{ fontSize: 10 }} onClick={revoke}>REVOKE LINK</button>
        </div>
      ) : (
        <div style={{ border: '1px dashed var(--border)', padding: 20, textAlign: 'center', marginBottom: 24 }}>
          <p className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>NO ACTIVE SHARE LINK</p>
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', padding: 20 }}>
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>{file.share_token ? 'REPLACE LINK' : 'CREATE LINK'}</p>
        <div style={{ marginBottom: 14 }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>EXPIRY</label>
          <select value={expiry} onChange={e => setExpiry(e.target.value)}>
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="never">Never</option>
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>MAX DOWNLOADS <span style={{ color: 'var(--dim)' }}>(blank = unlimited)</span></label>
          <input type="number" min="1" placeholder="e.g. 5" value={maxDl} onChange={e => setMaxDl(e.target.value)} />
        </div>
        <button className="btn-p" onClick={create} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span className="spin" />}{saving ? 'GENERATING...' : saved ? '✓ CREATED' : '⊗ GENERATE LINK →'}
        </button>
      </div>
    </div>
  )
}
