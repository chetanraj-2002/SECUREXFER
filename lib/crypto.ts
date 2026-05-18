// AES-256-GCM client-side encryption + auxiliary primitives.
// Uses pure for-loops — NO spread operators on typed arrays (ES2017+ safe).

function u8ToB64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

// Returns a Uint8Array backed by a fresh ArrayBuffer (not SharedArrayBuffer) — keeps
// TypeScript's BufferSource overloads happy on @types/node ≥ 22.
function b64ToU8(b64: string): Uint8Array {
  const s = atob(b64)
  const buf = new ArrayBuffer(s.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out as unknown as Uint8Array
}

// Convenience: typed BufferSource view (avoids ArrayBufferLike inference at call sites).
function asBuf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return u8ToB64(new Uint8Array(raw))
}

export async function importKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', asBuf(b64ToU8(b64)), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asBuf(iv) }, key, await file.arrayBuffer())
  return { encrypted, iv: u8ToB64(iv) }
}

export async function decryptFile(data: ArrayBuffer, key: CryptoKey, ivB64: string): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: asBuf(b64ToU8(ivB64)) }, key, data)
}

export function generateShareToken(): string {
  const a = new Uint8Array(24)
  crypto.getRandomValues(a)
  return u8ToB64(a).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Six-digit numeric OTP (cryptographically random).
export function generateOtp(): string {
  const a = new Uint8Array(4)
  crypto.getRandomValues(a)
  const n = (a[0] << 24 | a[1] << 16 | a[2] << 8 | a[3]) >>> 0
  return String(n % 1000000).padStart(6, '0')
}

// Salted SHA-256 password hash for share-link gating (deterministic per share).
// Stored as `salt$hash`; salt is per-share random.
export async function hashPassword(password: string, saltB64?: string): Promise<string> {
  const salt = saltB64 ? b64ToU8(saltB64) : crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder().encode(password)
  const buf = new Uint8Array(salt.length + enc.length)
  for (let i = 0; i < salt.length; i++) buf[i] = salt[i]
  for (let i = 0; i < enc.length; i++) buf[i + salt.length] = enc[i]
  // Stretch via repeated SHA-256 (10k rounds) — cheap PBKDF-style hardening.
  let digest = await crypto.subtle.digest('SHA-256', buf)
  for (let i = 0; i < 10000; i++) digest = await crypto.subtle.digest('SHA-256', digest)
  return u8ToB64(salt) + '$' + u8ToB64(new Uint8Array(digest))
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split('$')
  if (!saltB64 || !hashB64) return false
  const candidate = await hashPassword(password, saltB64)
  // Constant-time compare.
  const a = candidate, b = stored
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
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
