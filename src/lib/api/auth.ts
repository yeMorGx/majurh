import { auth } from '@/lib/auth/server';
import { getDatabase } from '@/lib/neon/db';

export async function getAuthenticatedClient() {
  const db = getDatabase();
  const { data: session } = await auth.getSession();
  const user = session?.user;
  const authUserId = typeof user?.id === 'string' ? user.id : null;
  const email = typeof user?.email === 'string' ? user.email : null;

  let userId = authUserId;
  if (authUserId && email) {
    const legacyUsers = (await db`
      select id
      from public.legacy_auth_users
      where lower(email) = lower(${email})
      limit 1
    `) as Array<{ id: string }>;

    userId = legacyUsers[0]?.id ?? authUserId;
  }

  return { db, userId, email };
}

export async function getOrganizationRole(
  db: Awaited<ReturnType<typeof getAuthenticatedClient>>['db'],
  userId: string,
  organizationId: string,
) {
  const rows = (await db`
    select role
    from public.organization_members
    where organization_id = ${organizationId}::uuid
      and user_id = ${userId}
    limit 1
  `) as Array<{ role: 'admin' | 'recruiter' | 'viewer' }>;

  return rows[0]?.role ?? null;
}
