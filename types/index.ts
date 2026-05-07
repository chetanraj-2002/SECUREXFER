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
  created_at: string
  updated_at: string
}

export type UploadStatus = 'idle' | 'encrypting' | 'uploading' | 'done' | 'error'
