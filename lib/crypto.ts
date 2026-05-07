// AES-256-GCM client-side encryption
// Uses pure for-loops — NO spread operators on typed arrays
// Compatible with TypeScript target ES2017+

function u8ToB64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToU8(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return u8ToB64(new Uint8Array(raw))
}

export async function importKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToU8(b64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await file.arrayBuffer())
  return { encrypted, iv: u8ToB64(iv) }
}

export async function decryptFile(data: ArrayBuffer, key: CryptoKey, ivB64: string): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToU8(ivB64) }, key, data)
}

export function generateShareToken(): string {
  const a = new Uint8Array(24)
  crypto.getRandomValues(a)
  return u8ToB64(a).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function formatBytes(n: number): string {
  if (n === 0) return '0 B'
  const k = 1024, s = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(n) / Math.log(k))
  return parseFloat((n / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]
}

export function fileIcon(mime: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (mime.startsWith('image/')) return 'IMG'
  if (mime.startsWith('video/')) return 'VID'
  if (mime.startsWith('audio/')) return 'AUD'
  if (mime === 'application/pdf') return 'PDF'
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'ZIP'
  if (['doc','docx'].includes(ext)) return 'DOC'
  if (['xls','xlsx'].includes(ext)) return 'XLS'
  if (['js','ts','py','java','c','cpp','go'].includes(ext)) return 'SRC'
  if (['txt','md','csv'].includes(ext)) return 'TXT'
  return 'BIN'
}
