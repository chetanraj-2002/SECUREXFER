'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatBytes, fileIcon, importKey, decryptFile } from '@/lib/crypto'
import { FileRecord } from '@/types'
import { formatDistanceToNow } from 'date-fns'

type Filter = 'all' | 'shared' | 'private' | 'protected'
type SortBy = 'newest' | 'oldest' | 'largest' | 'smallest' | 'name'

const QUOTA_BYTES = 50 * 1024 * 1024 // 50 MB Supabase free-tier file limit hint

export default function Dashboard() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [del, setDel] = useState<string | null>(null)
  const [dl, setDl] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<SortBy>('newest')

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb.from('files').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(f: FileRecord) {
    if (!confirm(`Delete "${f.original_name}"?`)) return
    setDel(f.id)
    const sb = createClient()
    await sb.storage.from('encrypted-files').remove([f.storage_path])
    await sb.from('files').delete().eq('id', f.id)
    setFiles(p => p.filter(x => x.id !== f.id))
    setDel(null)
  }

  async function download(f: FileRecord) {
    setDl(f.id)
    try {
      const sb = createClient()
      const { data, error } = await sb.storage.from('encrypted-files').download(f.storage_path)
      if (error || !data) throw new Error('failed')
      const key = await importKey(f.encryption_key)
      const dec = await decryptFile(await data.arrayBuffer(), key, f.iv)
      const url = URL.createObjectURL(new Blob([dec], { type: f.mime_type }))
      Object.assign(document.createElement('a'), { href: url, download: f.original_name }).click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed.') }
    setDl(null)
  }

  const visible = useMemo(() => {
    const lo = q.trim().toLowerCase()
    const out = files.filter(f => {
      if (lo && !f.original_name.toLowerCase().includes(lo) && !f.mime_type.toLowerCase().includes(lo)) return false
      if (filter === 'shared' && !f.share_token) return false
      if (filter === 'private' && f.share_token) return false
      if (filter === 'protected' && !(f.share_password_hash || f.share_otp_code || (f.share_recipient_emails?.length ?? 0) > 0)) return false
      return true
    })
    const cmp = (a: FileRecord, b: FileRecord) => {
      switch (sort) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'largest': return b.size - a.size
        case 'smallest': return a.size - b.size
        case 'name': return a.original_name.localeCompare(b.original_name)
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    }
    return [...out].sort(cmp)
  }, [files, q, filter, sort])

  const totalSize = files.reduce((a, f) => a + f.size, 0)
  const quotaPct = Math.min(100, Math.round((totalSize / (QUOTA_BYTES * 10)) * 100)) // soft 500MB shown
  const protectedCount = files.filter(f => f.share_password_hash || f.share_otp_code || (f.share_recipient_emails?.length ?? 0) > 0).length

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>FILE VAULT</p>
          <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400 }}>Your Files</h1>
        </div>
        <Link href="/dashboard/upload"><button className="btn-p">↑ UPLOAD FILE</button></Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 20 }}>
        {[
          ['TOTAL FILES', String(files.length), 'var(--accent)'],
          ['TOTAL SIZE', formatBytes(totalSize), 'var(--accent)'],
          ['ACTIVE SHARES', String(files.filter(f => f.share_token).length), 'var(--green)'],
          ['PROTECTED', String(protectedCount), 'var(--blue)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--surface)', padding: '16px 20px' }}>
            <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 6 }}>{l}</p>
            <p className="mono" style={{ fontSize: 20, color: c as string }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24, padding: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em' }}>STORAGE USAGE</p>
          <p className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{formatBytes(totalSize)} <span style={{ color: 'var(--dim)' }}>· {quotaPct}% of soft limit</span></p>
        </div>
        <progress value={quotaPct} max={100} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ flex: '1 1 240px', maxWidth: 360 }} placeholder="Search by name or MIME..." value={q} onChange={e => setQ(e.target.value)} />
        <select value={filter} onChange={e => setFilter(e.target.value as Filter)} style={{ maxWidth: 180 }}>
          <option value="all">All files</option>
          <option value="shared">Shared only</option>
          <option value="private">Private only</option>
          <option value="protected">Protected (pwd/email/OTP)</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as SortBy)} style={{ maxWidth: 180 }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="largest">Largest first</option>
          <option value="smallest">Smallest first</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><span className="spin" /></div>
      ) : visible.length === 0 ? (
        <div style={{ border: '1px dashed var(--border)', padding: 64, textAlign: 'center' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>{files.length === 0 ? 'NO FILES YET' : 'NO MATCHES'}</p>
          {files.length === 0 && <Link href="/dashboard/upload"><button className="btn-g">UPLOAD YOUR FIRST FILE →</button></Link>}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 130px 130px 130px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['TYPE','NAME','SIZE','PROTECTION','UPLOADED','ACTIONS'].map(h => <p key={h} className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em' }}>{h}</p>)}
          </div>
          {visible.map((f, i) => {
            const tags: { cls: string; label: string }[] = []
            if (f.share_token) tags.push({ cls: 'tag-g', label: 'LIVE' })
            if (f.share_password_hash) tags.push({ cls: 'tag-b', label: '🔒' })
            if ((f.share_recipient_emails?.length ?? 0) > 0) tags.push({ cls: 'tag-b', label: '✉' })
            if (f.share_otp_code) tags.push({ cls: 'tag-a', label: '🔑' })
            if (f.share_self_destruct) tags.push({ cls: 'tag-r', label: '⚠' })
            if (!tags.length) tags.push({ cls: 'tag-x', label: 'NONE' })
            return (
              <div key={f.id} className="ani" style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 130px 130px 130px', padding: '12px 16px', borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div><span className="tag tag-x" style={{ fontSize: 9, padding: '2px 5px' }}>{fileIcon(f.mime_type, f.original_name)}</span></div>
                <p className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</p>
                <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{formatBytes(f.size)}</p>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{tags.map((t, j) => <span key={j} className={`tag ${t.cls}`} style={{ fontSize: 9 }}>{t.label}</span>)}</div>
                <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => download(f)} disabled={dl === f.id}>{dl === f.id ? <span className="spin" style={{ width: 10, height: 10 }} /> : '↓'}</button>
                  <Link href={`/dashboard/share/${f.id}`}><button className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }}>⊗</button></Link>
                  <button className="btn-d" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => remove(f)} disabled={del === f.id}>{del === f.id ? <span className="spin" style={{ width: 10, height: 10 }} /> : '×'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
