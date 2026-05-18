export interface FileRecord {
  id: string
  owner_id: string
  filename: string
  original_name: string
  size: number
  mime_type: string
  storage_path: string
  encryption_key: string
  iv: string
  share_token: string | null
  share_expires_at: string | null
  share_max_downloads: number | null
  share_download_count: number
  share_password_hash: string | null
  share_recipient_emails: string[] | null
  share_otp_code: string | null
  share_message: string | null
  share_view_count: number
  share_self_destruct: boolean
  created_at: string
  updated_at: string
}

export type UploadStatus = 'idle' | 'encrypting' | 'uploading' | 'done' | 'error'

export interface DownloadLog {
  id: string
  file_id: string
  owner_id: string
  recipient_email: string | null
  status: 'success' | 'denied_email' | 'denied_password' | 'denied_otp' | 'denied_expired' | 'denied_maxed'
  user_agent: string | null
  ip_hint: string | null
  created_at: string
}
