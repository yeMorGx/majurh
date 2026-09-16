import type { DatabaseClient } from '@/lib/neon/db';

export type OrganizationMembershipByEmail = {
  organization_id: string;
  organization_name: string;
  user_id: string;
  email: string | null;
  role: 'admin' | 'recruiter' | 'viewer';
};

/**
 * Resolve o vínculo pelo e-mail efetivo, incluindo membros migrados cujo
 * e-mail ainda está somente no catálogo legacy_auth_users.
 */
export async function findMembershipsByEmail(db: DatabaseClient, email: string) {
  return await db`
    select om.organization_id, o.name as organization_name, om.user_id, om.email, om.role
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    left join public.legacy_auth_users lau on lau.id = om.user_id
    where lower(coalesce(nullif(btrim(om.email), ''), nullif(btrim(lau.email), ''))) = lower(btrim(${email}))
    order by om.created_at asc
  ` as OrganizationMembershipByEmail[];
}

export async function findMembershipByEmail(db: DatabaseClient, email: string) {
  const rows = await findMembershipsByEmail(db, email);
  return rows[0] ?? null;
}
