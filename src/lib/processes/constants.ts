export const processStatuses = [
  'new',
  'screening',
  'interview',
  'evaluation',
  'approved',
  'documentation',
  'admission',
  'hired',
  'rejected',
  'withdrawn',
  'talent_pool',
] as const;

export type ProcessStatus = (typeof processStatuses)[number];

export const candidateSources = [
  'linkedin',
  'indeed',
  'referral',
  'whatsapp',
  'talent_pool',
  'other',
] as const;

export type CandidateSource = (typeof candidateSources)[number];

export const withdrawalReasonCodes = [
  'other_offer',
  'salary',
  'schedule',
  'location',
  'benefits',
  'personal',
  'no_response',
  'no_reason_informed',
  'other',
] as const;

export type WithdrawalReasonCode = (typeof withdrawalReasonCodes)[number];

export const reapplicationDecisions = ['yes', 'no', 'review'] as const;

export type ReapplicationDecision = (typeof reapplicationDecisions)[number];

export const processSelect = [
  'id',
  'organization_id',
  'candidate_id',
  'vacancy_id',
  'responsible_user_id',
  'source',
  'status',
  'started_at',
  'finished_at',
  'withdrawal_reason_code',
  'withdrawal_notes',
  'can_apply_again',
  'created_at',
  'updated_at',
].join(', ');

export const processHistorySelect = [
  'id',
  'organization_id',
  'process_id',
  'actor_user_id',
  'action',
  'old_status',
  'new_status',
  'notes',
  'created_at',
].join(', ');
