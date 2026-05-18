// Email Verifier — syntax, disposable detection, typo correction, role detection, risk scoring.
// Pure client-side. No external API calls (works offline).

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','tempmail.com','10minutemail.com','guerrillamail.com','throwaway.email',
  'temp-mail.org','yopmail.com','sharklasers.com','getnada.com','trashmail.com','dispostable.com',
  'maildrop.cc','mintemail.com','fakeinbox.com','mailnesia.com','spambox.us','mailcatch.com',
  'tempinbox.com','emailondeck.com','mohmal.com','tempmailaddress.com','tempr.email','mytemp.email',
  'mailtemp.info','fake-mail.net','tmpmail.org','mvrht.net','spam4.me','tempemail.net',
])

const FREE_PROVIDERS = new Set([
  'gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','protonmail.com',
  'pm.me','proton.me','live.com','msn.com','gmx.com','gmx.net','zoho.com','yandex.com',
  'yandex.ru','mail.com','tutanota.com','rediffmail.com','fastmail.com',
])

const ROLE_ACCOUNTS = new Set([
  'admin','administrator','info','support','sales','contact','help','noreply','no-reply',
  'webmaster','postmaster','hostmaster','abuse','security','marketing','billing','accounts',
  'team','hello','careers','jobs','press','media','feedback','office','enquiries','enquiry',
])

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com':'gmail.com','gmai.com':'gmail.com','gmail.co':'gmail.com','gmail.cm':'gmail.com',
  'gnail.com':'gmail.com','gmail.con':'gmail.com','gmaill.com':'gmail.com','gmail.comm':'gmail.com',
  'yaho.com':'yahoo.com','yahho.com':'yahoo.com','yahoo.co':'yahoo.com','yahooo.com':'yahoo.com',
  'hotmial.com':'hotmail.com','hotmai.com':'hotmail.com','hotmail.co':'hotmail.com',
  'htomail.com':'hotmail.com','hotmal.com':'hotmail.com','hotmali.com':'hotmail.com',
  'outlok.com':'outlook.com','outloo.com':'outlook.com','outlook.co':'outlook.com',
  'icloud.co':'icloud.com','iclod.com':'icloud.com','iclould.com':'icloud.com',
  'protonmial.com':'protonmail.com','protonmai.com':'protonmail.com',
}

const TLD_TYPOS: Record<string, string> = {
  'con':'com','cm':'com','vom':'com','comm':'com','om':'com',
  'ner':'net','ne':'net','nett':'net',
  'ort':'org','rg':'org','orgg':'org',
}

const RFC_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export type EmailVerdict = 'valid' | 'risky' | 'invalid'

export interface EmailVerificationResult {
  email: string
  normalized: string
  verdict: EmailVerdict
  score: number             // 0-100, higher is safer
  reason: string            // short summary
  suggestion: string | null // typo-correction suggestion, if any
  syntax_valid: boolean
  is_disposable: boolean
  is_free_provider: boolean
  is_role_account: boolean
  has_plus_alias: boolean
  domain: string
  local: string
  checks: { label: string; pass: boolean; note?: string }[]
}

function correctTypo(domain: string): string | null {
  const lower = domain.toLowerCase()
  if (COMMON_DOMAIN_TYPOS[lower]) return COMMON_DOMAIN_TYPOS[lower]
  const lastDot = lower.lastIndexOf('.')
  if (lastDot > 0) {
    const tld = lower.slice(lastDot + 1)
    if (TLD_TYPOS[tld]) return lower.slice(0, lastDot + 1) + TLD_TYPOS[tld]
  }
  return null
}

export function verifyEmail(raw: string): EmailVerificationResult {
  const email = (raw || '').trim()
  const normalized = email.toLowerCase()
  const [local = '', domain = ''] = normalized.split('@')
  const localBare = local.split('+')[0]
  const hasPlus = local.includes('+')

  const syntax = RFC_REGEX.test(email) && domain.length > 0 && domain.includes('.')
  const disposable = DISPOSABLE_DOMAINS.has(domain)
  const free = FREE_PROVIDERS.has(domain)
  const role = ROLE_ACCOUNTS.has(localBare)
  const suggestion = correctTypo(domain)
  const tooLong = email.length > 254 || local.length > 64

  let score = 100
  const checks: EmailVerificationResult['checks'] = []

  checks.push({ label: 'Syntax (RFC 5322)', pass: syntax, note: syntax ? 'Well-formed' : 'Malformed address' })
  if (!syntax) score -= 60
  if (tooLong) { score -= 20; checks.push({ label: 'Length limits', pass: false, note: 'Exceeds RFC limits' }) }
  else checks.push({ label: 'Length limits', pass: true, note: `${email.length}/254 chars` })

  checks.push({ label: 'Not disposable', pass: !disposable, note: disposable ? `${domain} is a temp-mail service` : 'Domain not in blocklist' })
  if (disposable) score -= 50

  checks.push({ label: 'Not role account', pass: !role, note: role ? `"${localBare}" is a shared mailbox` : 'Personal local-part' })
  if (role) score -= 15

  checks.push({ label: 'No suspected typo', pass: !suggestion, note: suggestion ? `Did you mean ...@${suggestion}?` : 'No common typo detected' })
  if (suggestion) score -= 25

  checks.push({ label: 'Provider class', pass: true, note: free ? 'Free webmail' : domain ? 'Business / custom domain' : '—' })

  checks.push({ label: 'Plus aliasing', pass: !hasPlus, note: hasPlus ? 'Sub-address alias detected' : 'No alias' })
  if (hasPlus) score -= 5

  score = Math.max(0, Math.min(100, score))
  let verdict: EmailVerdict
  let reason: string
  if (!syntax) { verdict = 'invalid'; reason = 'Invalid syntax — cannot be a real address' }
  else if (disposable) { verdict = 'invalid'; reason = 'Disposable / temp-mail domain' }
  else if (suggestion) { verdict = 'risky'; reason = `Likely typo — did you mean @${suggestion}?` }
  else if (role) { verdict = 'risky'; reason = 'Role / shared mailbox' }
  else if (score >= 80) { verdict = 'valid'; reason = free ? 'Deliverable free webmail address' : 'Deliverable business address' }
  else { verdict = 'risky'; reason = 'Some signals warrant review' }

  return {
    email, normalized, verdict, score, reason, suggestion,
    syntax_valid: syntax, is_disposable: disposable, is_free_provider: free,
    is_role_account: role, has_plus_alias: hasPlus, domain, local,
    checks,
  }
}

export function verifyEmails(raw: string): EmailVerificationResult[] {
  return raw.split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean).map(verifyEmail)
}

// Normalize an email for equality matching: lowercase, strip plus-aliases on Gmail-like providers.
export function canonicalEmail(raw: string): string {
  const e = (raw || '').trim().toLowerCase()
  const [local = '', domain = ''] = e.split('@')
  if (!domain) return e
  const bare = local.split('+')[0]
  // Gmail also ignores dots in local-part
  if (domain === 'gmail.com' || domain === 'googlemail.com') return bare.replace(/\./g, '') + '@gmail.com'
  return bare + '@' + domain
}

export function isEmailMatch(a: string, b: string): boolean {
  return canonicalEmail(a) === canonicalEmail(b)
}
