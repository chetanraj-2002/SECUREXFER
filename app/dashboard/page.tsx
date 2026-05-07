'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatBytes, fileIcon, importKey, decryptFile } from '@/lib/crypto'
import { FileRecord } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [del, setDel] = useState<string | null>(null)
  const [dl, setDl] = useState<string | null>(null)

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

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>FILE VAULT</p>
          <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400 }}>Your Files</h1>
        </div>
        <Link href="/dashboard/upload"><button className="btn-p">↑ UPLOAD FILE</button></Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 32 }}>
        {[
          ['TOTAL FILES', String(files.length)],
          ['TOTAL SIZE', formatBytes(files.reduce((a, f) => a + f.size, 0))],
          ['ACTIVE SHARES', String(files.filter(f => f.share_token).length)],
        ].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--surface)', padding: '16px 20px' }}>
            <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 6 }}>{l}</p>
            <p className="mono" style={{ fontSize: 20 }}>{v}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><span className="spin" /></div>
      ) : files.length === 0 ? (
        <div style={{ border: '1px dashed var(--border)', padding: 64, textAlign: 'center' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>NO FILES YET</p>
          <Link href="/dashboard/upload"><button className="btn-g">UPLOAD YOUR FIRST FILE →</button></Link>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 90px 130px 130px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['TYPE','NAME','SIZE','SHARES','UPLOADED','ACTIONS'].map(h => <p key={h} className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em' }}>{h}</p>)}
          </div>
          {files.map((f, i) => (
            <div key={f.id} className="ani" style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 90px 130px 130px', padding: '12px 16px', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div><span className="tag tag-x" style={{ fontSize: 9, padding: '2px 5px' }}>{fileIcon(f.mime_type, f.original_name)}</span></div>
              <p className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</p>
              <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{formatBytes(f.size)}</p>
              <div>{f.share_token ? <span className="tag tag-g" style={{ fontSize: 9 }}>LIVE{f.share_download_count > 0 ? ` ·${f.share_download_count}↓` : ''}</span> : <span className="tag tag-x" style={{ fontSize: 9 }}>NONE</span>}</div>
              <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => download(f)} disabled={dl === f.id}>{dl === f.id ? <span className="spin" style={{ width: 10, height: 10 }} /> : '↓'}</button>
                <Link href={`/dashboard/share/${f.id}`}><button className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }}>⊗</button></Link>
                <button className="btn-d" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => remove(f)} disabled={del === f.id}>{del === f.id ? <span className="spin" style={{ width: 10, height: 10 }} /> : '×'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
