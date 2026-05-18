'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { generateKey, exportKey, encryptFile, formatBytes } from '@/lib/crypto'
import { v4 as uuid } from 'uuid'

type ItemStatus = 'pending' | 'encrypting' | 'uploading' | 'done' | 'error'
interface Item { file: File; status: ItemStatus; pct: number; msg: string; err?: string }

export default function Upload() {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [drag, setDrag] = useState(false)
  const [running, setRunning] = useState(false)

  const addFiles = useCallback((fs: FileList | File[]) => {
    const list: Item[] = []
    for (let i = 0; i < fs.length; i++) list.push({ file: fs[i], status: 'pending', pct: 0, msg: '' })
    setItems(p => [...p, ...list])
  }, [])

  const drop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  function update(idx: number, patch: Partial<Item>) {
    setItems(p => p.map((x, i) => i === idx ? { ...x, ...patch } : x))
  }

  async function go() {
    if (!items.length) return
    setRunning(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setRunning(false); alert('Not authenticated'); return }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.status === 'done') continue
      try {
        update(i, { status: 'encrypting', pct: 10, msg: 'Generating AES-256 key...' })
        const key = await generateKey()
        update(i, { pct: 30, msg: 'Encrypting in browser...' })
        const { encrypted, iv } = await encryptFile(it.file, key)
        const keyStr = await exportKey(key)
        update(i, { pct: 55 })

        update(i, { status: 'uploading', pct: 60, msg: 'Uploading encrypted payload...' })
        const id = uuid()
        const path = `${user.id}/${id}.enc`
        const blob = new Blob([encrypted], { type: 'application/octet-stream' })
        const { error: upErr } = await sb.storage.from('encrypted-files').upload(path, blob, { contentType: 'application/octet-stream' })
        if (upErr) throw upErr
        update(i, { pct: 85, msg: 'Saving record...' })
        const { error: dbErr } = await sb.from('files').insert({
          id, owner_id: user.id, filename: `${id}.enc`, original_name: it.file.name,
          size: it.file.size, mime_type: it.file.type || 'application/octet-stream',
          storage_path: path, encryption_key: keyStr, iv, share_download_count: 0,
        })
        if (dbErr) throw dbErr
        update(i, { status: 'done', pct: 100, msg: 'Encrypted & uploaded' })
      } catch (e: unknown) {
        update(i, { status: 'error', pct: 0, err: e instanceof Error ? e.message : 'Upload failed' })
      }
    }
    setRunning(false)
  }

  const allDone = items.length > 0 && items.every(i => i.status === 'done')
  const totalSize = items.reduce((a, i) => a + i.file.size, 0)
  const doneCount = items.filter(i => i.status === 'done').length

  return (
    <div style={{ padding: 32, maxWidth: 680 }}>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>SECURE UPLOAD</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400, marginBottom: 16 }}>Upload Files</h1>

      <div style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span className="tag tag-g" style={{ flexShrink: 0 }}>E2E</span>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>Each file is encrypted with its own AES-256-GCM key <span style={{ color: 'var(--text)' }}>in your browser</span> before upload. Keys never leave your device.</p>
      </div>

      <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={drop}
        onClick={() => !running && ref.current?.click()}
        style={{ border: `1px ${drag ? 'solid' : 'dashed'} ${drag ? 'var(--accent2)' : 'var(--border)'}`, padding: 36, textAlign: 'center', cursor: running ? 'default' : 'pointer', background: drag ? 'var(--raised)' : 'transparent', marginBottom: 16 }}>
        <input ref={ref} type="file" multiple style={{ display: 'none' }} onChange={e => e.target.files && addFiles(e.target.files)} />
        <p className="mono" style={{ fontSize: 28, color: 'var(--border2)', marginBottom: 8 }}>↑</p>
        <p className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>DROP FILES HERE</p>
        <p style={{ fontSize: 12, color: 'var(--dim)' }}>or click to browse · bulk upload supported</p>
      </div>

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>QUEUE · {doneCount}/{items.length} DONE · {formatBytes(totalSize)}</p>
            {!running && !allDone && <button className="btn-g" style={{ fontSize: 10 }} onClick={() => setItems([])}>CLEAR ALL</button>}
          </div>

          <div style={{ border: '1px solid var(--border)', marginBottom: 20 }}>
            {items.map((it, i) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <p className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.file.name}</p>
                    <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{formatBytes(it.file.size)} · {it.file.type || 'unknown'}</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {it.status === 'done' && <span className="tag tag-g">DONE</span>}
                    {it.status === 'error' && <span className="tag tag-r">FAILED</span>}
                    {(it.status === 'encrypting' || it.status === 'uploading') && <span className="tag tag-b">{it.status.toUpperCase()}</span>}
                    {it.status === 'pending' && (
                      <button className="btn-g" style={{ fontSize: 10 }} disabled={running} onClick={() => setItems(p => p.filter((_, j) => j !== i))}>×</button>
                    )}
                  </div>
                </div>
                {(it.status === 'encrypting' || it.status === 'uploading') && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{it.msg}</p>
                      <p className="mono" style={{ fontSize: 10, color: 'var(--accent2)' }}>{it.pct}%</p>
                    </div>
                    <progress value={it.pct} max={100} />
                  </div>
                )}
                {it.status === 'error' && <p className="mono" style={{ fontSize: 11, color: 'var(--red)' }}>{it.err}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-p" onClick={go} disabled={!items.length || running || allDone} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {running && <span className="spin" />}{running ? 'PROCESSING...' : allDone ? '✓ ALL DONE' : `↑ ENCRYPT & UPLOAD ${items.length || ''}`}
        </button>
        <button className="btn-g" onClick={() => router.push('/dashboard')}>{allDone ? 'GO TO FILES →' : 'CANCEL'}</button>
      </div>
    </div>
  )
}
