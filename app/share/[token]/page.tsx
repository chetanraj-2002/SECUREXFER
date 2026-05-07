'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatBytes, importKey, decryptFile, fileIcon } from '@/lib/crypto'
import { FileRecord } from '@/types'
import { formatDistanceToNow } from 'date-fns'

type St = 'loading'|'ready'|'downloading'|'done'|'expired'|'not_found'|'maxed'

export default function PublicShare() {
  const params = useParams()
  const token = (params && params.token) ? String(params.token) : ''

  const [file, setFile] = useState<FileRecord | null>(null)
  const [owner, setOwner] = useState('Unknown')
  const [st, setSt] = useState<St>('loading')
  const [pct, setPct] = useState(0)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) return
    const sb = createClient()
    sb.from('files').select('*').eq('share_token', token).single().then(({ data }) => {
      if (!data) { setSt('not_found'); return }
      if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) { setSt('expired'); return }
      if (data.share_max_downloads !== null && data.share_download_count >= data.share_max_downloads) { setSt('maxed'); return }
      setFile(data)
      sb.from('profiles').select('display_name,email').eq('id', data.owner_id).single().then(({ data: p }) => {
        if (p) setOwner(p.display_name || p.email)
      })
      setSt('ready')
    })
  }, [token])

  async function dl() {
    if (!file) return
    setSt('downloading'); setPct(10)
    try {
      const sb = createClient()
      setMsg('Fetching encrypted file...'); setPct(20)
      const { data, error } = await sb.storage.from('encrypted-files').download(file.storage_path)
      if (error || !data) throw new Error('Fetch failed')
      setPct(45); setMsg('Decrypting in browser...')
      const key = await importKey(file.encryption_key)
      const dec = await decryptFile(await data.arrayBuffer(), key, file.iv)
      setPct(85); setMsg('Saving...')
      const url = URL.createObjectURL(new Blob([dec], { type: file.mime_type }))
      Object.assign(document.createElement('a'), { href: url, download: file.original_name }).click()
      URL.revokeObjectURL(url)
      await sb.from('files').update({ share_download_count: file.share_download_count + 1 }).eq('id', file.id)
      setPct(100); setSt('done')
    } catch { setSt('ready'); alert('Download failed. Please try again.') }
  }

  const errPages: Record<string, [string, string, string]> = {
    not_found: ['tag-r', 'INVALID LINK', 'This link may have been revoked or never existed.'],
    expired:   ['tag-a', 'EXPIRED', 'Ask the sender to generate a new share link.'],
    maxed:     ['tag-a', 'LIMIT REACHED', 'This link has reached its download limit.'],
  }

  if (st === 'loading') return <Shell><div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 48 }}><span className="spin" /><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>Verifying...</span></div></Shell>

  if (errPages[st]) {
    const [cls, title, desc] = errPages[st]
    return <Shell><div style={{ padding: 48, textAlign: 'center' }}><span className={`tag ${cls}`} style={{ display: 'inline-block', marginBottom: 16 }}>{title}</span><p className="mono" style={{ fontSize: 14, marginBottom: 8 }}>{title}</p><p style={{ color: 'var(--muted)', fontSize: 13 }}>{desc}</p></div></Shell>
  }

  if (!file) return null

  return (
    <Shell>
      <div style={{ padding: 40, maxWidth: 460, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="tag tag-b" style={{ fontSize: 14, padding: '6px 14px', display: 'inline-block', marginBottom: 16 }}>{fileIcon(file.mime_type, file.original_name)}</span>
          <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 18, fontWeight: 400, marginBottom: 8, wordBreak: 'break-all' }}>{file.original_name}</h1>
          <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{formatBytes(file.size)} · from {owner}</p>
        </div>

        <div style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 24 }}>
          <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.06em', marginBottom: 6 }}>SECURITY NOTICE</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>Decrypted <span style={{ color: 'var(--text)' }}>in your browser</span> using AES-256-GCM. No plaintext leaves your device.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {[
            ['DOWNLOADS', `${file.share_download_count}${file.share_max_downloads !== null ? `/${file.share_max_downloads}` : ''}`],
            ['EXPIRES', file.share_expires_at ? formatDistanceToNow(new Date(file.share_expires_at), { addSuffix: true }) : 'Never'],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="mono" style={{ fontSize: 9, color: 'var(--dim)', marginBottom: 3 }}>{k}</p>
              <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{v}</p>
            </div>
          ))}
        </div>

        {st === 'downloading' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{msg}</p>
              <p className="mono" style={{ fontSize: 11, color: 'var(--accent2)' }}>{pct}%</p>
            </div>
            <progress value={pct} max={100} />
          </div>
        )}

        {st === 'done' && <div style={{ padding: 12, border: '1px solid var(--green-d)', background: 'rgba(74,222,128,.05)', marginBottom: 16, textAlign: 'center' }}><p className="mono" style={{ fontSize: 12, color: 'var(--green)' }}>✓ File saved to your device</p></div>}

        <button className="btn-p" onClick={dl} disabled={st === 'downloading' || st === 'done'}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 }}>
          {st === 'downloading' && <span className="spin" />}
          {st === 'done' ? '✓ DOWNLOAD COMPLETE' : st === 'downloading' ? 'DECRYPTING...' : '↓ DECRYPT & DOWNLOAD'}
        </button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><span className="mono" style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)' }}>SECUREXFER</span></Link>
        <span className="tag tag-g">SECURE CHANNEL</span>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '12px 32px', textAlign: 'center' }}>
        <p className="mono" style={{ fontSize: 10, color: 'var(--dim)' }}>AES-256-GCM · DECRYPTED IN BROWSER · ZERO KNOWLEDGE</p>
      </footer>
    </main>
  )
}
