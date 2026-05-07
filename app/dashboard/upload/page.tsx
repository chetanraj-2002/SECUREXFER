'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { generateKey, exportKey, encryptFile, formatBytes } from '@/lib/crypto'
import { v4 as uuid } from 'uuid'
import { UploadStatus } from '@/types'

export default function Upload() {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [drag, setDrag] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [pct, setPct] = useState(0)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const drop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) setFile(f)
  }, [])

  async function go() {
    if (!file) return
    setErr(''); setStatus('encrypting'); setMsg('Generating AES-256 key...'); setPct(10)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      setMsg('Encrypting file in browser...'); setPct(30)
      const key = await generateKey()
      const { encrypted, iv } = await encryptFile(file, key)
      const keyStr = await exportKey(key)
      setPct(55)

      setStatus('uploading'); setMsg('Uploading encrypted payload...'); setPct(60)
      const id = uuid()
      const path = `${user.id}/${id}.enc`
      const blob = new Blob([encrypted], { type: 'application/octet-stream' })
      const { error: upErr } = await sb.storage.from('encrypted-files').upload(path, blob, { contentType: 'application/octet-stream' })
      if (upErr) throw upErr
      setPct(85)

      setMsg('Saving record...')
      const { error: dbErr } = await sb.from('files').insert({
        id, owner_id: user.id, filename: `${id}.enc`, original_name: file.name,
        size: file.size, mime_type: file.type || 'application/octet-stream',
        storage_path: path, encryption_key: keyStr, iv, share_download_count: 0,
      })
      if (dbErr) throw dbErr

      setPct(100); setStatus('done'); setMsg('Upload complete.')
      setTimeout(() => router.push('/dashboard'), 1400)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
      setStatus('error'); setPct(0)
    }
  }

  const busy = status === 'encrypting' || status === 'uploading'
  const done = status === 'done'

  return (
    <div style={{ padding: 32, maxWidth: 580 }}>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>SECURE UPLOAD</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400, marginBottom: 28 }}>Upload File</h1>

      <div style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span className="tag tag-g" style={{ flexShrink: 0 }}>E2E</span>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>Encrypted with AES-256-GCM <span style={{ color: 'var(--text)' }}>in your browser</span> before upload. Encryption key never leaves your device.</p>
      </div>

      <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={drop}
        onClick={() => !file && ref.current?.click()}
        style={{ border: `1px ${drag ? 'solid' : 'dashed'} ${drag ? 'var(--accent2)' : file ? 'var(--border2)' : 'var(--border)'}`, padding: 40, textAlign: 'center', cursor: file ? 'default' : 'pointer', background: drag ? 'var(--raised)' : 'transparent', marginBottom: 20 }}>
        <input ref={ref} type="file" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
        {file ? (
          <div>
            <p className="mono" style={{ fontSize: 14, marginBottom: 6 }}>{file.name}</p>
            <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{formatBytes(file.size)} · {file.type || 'unknown'}</p>
            {!busy && !done && <button className="btn-g" style={{ marginTop: 12, fontSize: 10 }} onClick={e => { e.stopPropagation(); setFile(null) }}>CHANGE FILE</button>}
          </div>
        ) : (
          <div>
            <p className="mono" style={{ fontSize: 28, color: 'var(--border2)', marginBottom: 12 }}>↑</p>
            <p className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>DROP FILE HERE</p>
            <p style={{ fontSize: 12, color: 'var(--dim)' }}>or click to browse</p>
          </div>
        )}
      </div>

      {busy && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{msg}</p>
            <p className="mono" style={{ fontSize: 11, color: 'var(--accent2)' }}>{pct}%</p>
          </div>
          <progress value={pct} max={100} />
        </div>
      )}

      {done && <div style={{ padding: '12px 16px', border: '1px solid var(--green-d)', background: 'rgba(74,222,128,.05)', marginBottom: 16 }}><p className="mono" style={{ fontSize: 12, color: 'var(--green)' }}>✓ {msg} Redirecting...</p></div>}
      {err && <div style={{ padding: '12px 16px', border: '1px solid var(--red-d)', background: 'rgba(248,113,113,.05)', marginBottom: 16 }}><p className="mono" style={{ fontSize: 12, color: 'var(--red)' }}>✗ {err}</p></div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-p" onClick={go} disabled={!file || busy || done} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {busy && <span className="spin" />}{busy ? 'PROCESSING...' : '↑ ENCRYPT & UPLOAD'}
        </button>
        <button className="btn-g" onClick={() => router.push('/dashboard')}>CANCEL</button>
      </div>
    </div>
  )
}
