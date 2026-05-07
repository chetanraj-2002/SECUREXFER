import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SecureXfer',
  description: 'End-to-end encrypted file transfer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
