'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { DownloadLog, FileRecord } from '@/types'

type Row = DownloadLog & { file?: Pick<FileRecord, 'id' | 'original_name' | 'mime_type'> | null }

const STATUS_TAG: Record<DownloadLog['status'], { cls: string; label: string }> = {
  success:         { cls: 'tag-g', label: 'SUCCESS' },
  denied_email:    { cls: 'tag-r', label: 'EMAIL DENIED' },
  denied_password: { cls: 'tag-r', label: 'BAD PASSWORD' },
  denied_otp:      { cls: 'tag-r', label: 'BAD OTP' },
  denied_expired:  { cls: 'tag-a', label: 'EXPIRED' },
  denied_maxed:    { cls: 'tag-a', label: 'MAXED' },
}

export default function Activity() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | DownloadLog['status']>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await sb
        .from('download_logs')
        .select('*, file:files(id, original_name, mime_type)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      setRows((data as Row[]) || []); setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false
      if (q) {
        const hay = `${r.recipient_email ?? ''} ${r.file?.original_name ?? ''}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [rows, filter, q])

  const summary = useMemo(() => {
    const s = { total: rows.length, success: 0, denied: 0 }
    for (const r of rows) {
      if (r.status === 'success') s.success++
      else s.denied++
    }
    return s
  }, [rows])

  return (
    <div style={{ padding: 32 }}>
      <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>AUDIT TRAIL</p>
      <h1 style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Download Activity</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          ['TOTAL EVENTS', String(summary.total), 'var(--accent)'],
          ['SUCCESSFUL', String(summary.success), 'var(--green)'],
          ['DENIED', String(summary.denied), 'var(--red)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--surface)', padding: '16px 20px' }}>
            <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 6 }}>{l}</p>
            <p className="mono" style={{ fontSize: 20, color: c as string }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input style={{ flex: 1, maxWidth: 360 }} placeholder="Search by file or recipient..." value={q} onChange={e => setQ(e.target.value)} />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} style={{ maxWidth: 200 }}>
          <option value="all">All statuses</option>
          <option value="success">Success only</option>
          <option value="denied_email">Denied: email</option>
          <option value="denied_password">Denied: password</option>
          <option value="denied_otp">Denied: OTP</option>
          <option value="denied_expired">Denied: expired</option>
          <option value="denied_maxed">Denied: maxed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><span className="spin" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ border: '1px dashed var(--border)', padding: 48, textAlign: 'center' }}>
          <p className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>{rows.length === 0 ? 'NO DOWNLOAD ACTIVITY YET' : 'NO RESULTS FOR THIS FILTER'}</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 130px 160px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['STATUS','FILE','RECIPIENT','UA','WHEN'].map(h => <p key={h} className="mono" style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em' }}>{h}</p>)}
          </div>
          {filtered.map((r, i) => {
            const tag = STATUS_TAG[r.status] || { cls: 'tag-x', label: r.status.toUpperCase() }
            return (
              <div key={r.id} className="ani" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 130px 160px', padding: '10px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <span className={`tag ${tag.cls}`} style={{ width: 'fit-content' }}>{tag.label}</span>
                {r.file ? (
                  <Link href={`/dashboard/share/${r.file.id}`} style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}>
                    <p className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file.original_name}</p>
                  </Link>
                ) : (
                  <p className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>(deleted)</p>
                )}
                <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recipient_email || '—'}</p>
                <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.user_agent || ''}>{shortUa(r.user_agent)}</p>
                <p className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function shortUa(ua: string | null): string {
  if (!ua) return '—'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return ua.slice(0, 18)
}
