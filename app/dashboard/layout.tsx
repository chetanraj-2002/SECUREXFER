'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()
  const [name, setName] = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setName(data.user.user_metadata?.display_name || data.user.email || '')
    })
  }, [router])

  const nav = [
    { href: '/dashboard', label: 'FILES', icon: '▪' },
    { href: '/dashboard/upload', label: 'UPLOAD', icon: '↑' },
    { href: '/dashboard/shared', label: 'SHARED', icon: '⊗' },
    { href: '/dashboard/activity', label: 'ACTIVITY', icon: '◴' },
    { href: '/dashboard/email-verify', label: 'EMAIL VERIFY', icon: '@' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{ width: 200, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <span className="mono" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--accent)' }}>SECUREXFER</span>
        </div>
        <nav style={{ padding: 8, flex: 1 }}>
          {nav.map(n => {
            const active = path === n.href
            return (
              <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', marginBottom: 2, background: active ? 'var(--raised)' : 'transparent', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent' }}>
                  <span className="mono" style={{ fontSize: 12, color: active ? 'var(--accent)' : 'var(--dim)' }}>{n.icon}</span>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.06em', color: active ? 'var(--text)' : 'var(--muted)' }}>{n.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <p className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 2 }}>LOGGED IN AS</p>
          <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 10 }}>{name}</p>
          <button className="btn-g" style={{ width: '100%', fontSize: 10 }} onClick={async () => { await createClient().auth.signOut(); router.push('/') }}>SIGN OUT</button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
