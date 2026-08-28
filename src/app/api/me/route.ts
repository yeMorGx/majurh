import { getAuthenticatedClient } from '@/lib/api/auth';
import { errorJson, json, supabaseErrorResponse } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, userId, email } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const [{ data: profileData, error: profileError }, { data: membershipData, error: membershipError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    if (profileError || membershipError) {
      return supabaseErrorResponse(profileError ?? membershipError);
    }

    const profile = profileData as unknown as {
      id: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
    const membership = membershipData as unknown as {
      organization_id: string;
      role: 'admin' | 'recruiter' | 'viewer';
    } | null;

    let organization: {
      id: string;
      name: string;
      slug: string;
    } | null = null;

    if (membership) {
      const { data: organizationData, error: organizationError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', membership.organization_id)
        .single();

      if (organizationError) {
        return supabaseErrorResponse(organizationError);
      }

      organization = organizationData as unknown as typeof organization;
    }

    return json({
      data: {
        user: { id: userId, email },
        profile,
        membership,
        organization,
      },
    });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}
