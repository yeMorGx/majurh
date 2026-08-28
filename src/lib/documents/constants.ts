export const DOCUMENT_BUCKET = 'candidate-documents';
export const MAX_DOCUMENT_SIZE_BYTES = 6 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 5 * 60;

export const documentTypes = [
  'rg',
  'cpf',
  'cnh',
  'proof_of_address',
  'work_card',
  'resume',
  'certificate',
  'other',
] as const;

export type DocumentType = (typeof documentTypes)[number];

export const documentStatuses = [
  'pending',
  'uploaded',
  'in_review',
  'approved',
  'rejected',
  'request_again',
] as const;

export type DocumentStatus = (typeof documentStatuses)[number];

export const documentSelect = [
  'id',
  'organization_id',
  'candidate_id',
  'process_id',
  'document_type',
  'status',
  'storage_path',
  'original_name',
  'mime_type',
  'size_bytes',
  'uploaded_by',
  'reviewed_by',
  'reviewed_at',
  'notes',
  'created_at',
  'updated_at',
].join(', ');
