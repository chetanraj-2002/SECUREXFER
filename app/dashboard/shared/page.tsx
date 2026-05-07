'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatBytes, fileIcon } from '@/lib/crypto'
import { FileRecord } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export default function Shared() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await sb.from('files').select('*').eq('owner_id', user.id).not('share_token', 'is', null).order('created_at', { ascending: false })
      setFiles(data || []); setLoading(false)
    })
  }, [])

  async function revoke(id: string) {
    await createClient().from('files').update({ share_token: null, share_expires_at: null, share_max_downloads: null }).eq('id', id)
    setFiles(p => p.filter(f => f.id !== id))
  }

  return (
    <div style={{ padding: 32 }}>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>SHARE MANAGEMENT</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400, marginBottom: 32 }}>Active Shares</h1>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 48 }}><span className="spin" /><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>Loading...</span></div>
      ) : files.length === 0 ? (
        <div style={{ border: '1px dashed var(--border)', padding: 64, textAlign: 'center' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>NO ACTIVE SHARE LINKS</p>
          <Link href="/dashboard"><button className="btn-g">VIEW FILES →</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(f => {
            const expired = f.share_expires_at && new Date(f.share_expires_at) < new Date()
            const maxed = f.share_max_downloads !== null && f.share_download_count >= f.share_max_downloads
            const dead = expired || maxed
            return (
              <div key={f.id} className="card ani">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="tag tag-x" style={{ fontSize: 9, flexShrink: 0 }}>{fileIcon(f.mime_type, f.original_name)}</span>
                      <p className="mono" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</p>
                    </div>
                    <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{formatBytes(f.size)} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</p>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 12 }}>
                    {dead ? <span className="tag tag-r">{expired ? 'EXPIRED' : 'MAXED'}</span> : <span className="tag tag-g">LIVE</span>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['DL', `${f.share_download_count}${f.share_max_downloads !== null ? `/${f.share_max_downloads}` : '/∞'}`],
                    ['EXPIRES', f.share_expires_at ? formatDistanceToNow(new Date(f.share_expires_at), { addSuffix: true }) : 'Never'],
                    ['TOKEN', `...${f.share_token!.slice(-10)}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: '8px 10px', background: 'var(--raised)', border: '1px solid var(--border)' }}>
                      <p className="mono" style={{ fontSize: 9, color: 'var(--dim)', marginBottom: 2 }}>{k}</p>
                      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {!dead && <button className="btn-g" style={{ fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${f.share_token}`); setCopied(f.id); setTimeout(() => setCopied(null), 2000) }}>{copied === f.id ? '✓ COPIED' : 'COPY LINK'}</button>}
                  <Link href={`/dashboard/share/${f.id}`}><button className="btn-g" style={{ fontSize: 10 }}>EDIT</button></Link>
                  <button className="btn-d" style={{ fontSize: 10 }} onClick={() => revoke(f.id)}>REVOKE</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
