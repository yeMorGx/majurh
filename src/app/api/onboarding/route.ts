import { getAuthenticatedClient } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body)) return errorJson('Informe os dados do onboarding.', 400);

    const preferredName = typeof body.preferredName === 'string' ? body.preferredName.trim() : '';
    const birthDate = typeof body.birthDate === 'string' && body.birthDate ? body.birthDate : null;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
    const avatarPath = typeof body.avatarPath === 'string' ? body.avatarPath.trim() : null;
    const leadSource = typeof body.leadSource === 'string' ? body.leadSource : '';
    const referralName = typeof body.referralName === 'string' ? body.referralName.trim() : null;
    const primaryGoal = typeof body.primaryGoal === 'string' ? body.primaryGoal : '';
    const validLeadSources = new Set(['linkedin', 'referral', 'google', 'instagram', 'event', 'other']);
    const validGoals = new Set(['organize_hr', 'documents_payroll', 'explore']);
    if (preferredName.length < 2 || preferredName.length > 120) return errorJson('O nome de preferência deve ter entre 2 e 120 caracteres.', 400);
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return errorJson('Informe uma data de nascimento válida.', 400);
    if (phone && phone.length > 40) return errorJson('O telefone informado é muito longo.', 400);
    if (avatarPath && (!avatarPath.startsWith('profiles/') || avatarPath.includes('..'))) return errorJson('A foto de perfil enviada é inválida.', 400);
    if (!validLeadSources.has(leadSource)) return errorJson('Selecione como você conheceu o Majurh.', 400);
    if (leadSource === 'referral' && (!referralName || referralName.length < 2 || referralName.length > 120)) return errorJson('Informe quem fez a indicação.', 400);
    if (leadSource !== 'referral' && referralName) return errorJson('A indicação só pode ser preenchida quando essa opção estiver selecionada.', 400);
    if (!validGoals.has(primaryGoal)) return errorJson('Selecione seu principal objetivo.', 400);

    const { db, userId, authUserId, email } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }
    const profileUserId = authUserId ?? userId;

    const rows = await db`
      insert into public.profiles (id, full_name)
      values (${profileUserId}, ${preferredName})
      on conflict (id) do update set full_name = excluded.full_name
      returning id, full_name, avatar_url
    `;

    await db`
      insert into public.user_onboarding_profiles (
        user_id, preferred_name, birth_date, phone, avatar_path,
        lead_source, referral_name, primary_goal
      ) values (
        ${profileUserId}, ${preferredName}, ${birthDate}::date, ${phone}, ${avatarPath},
        ${leadSource}, ${leadSource === 'referral' ? referralName : null}, ${primaryGoal}
      )
      on conflict (user_id) do update set
        preferred_name = excluded.preferred_name,
        birth_date = excluded.birth_date,
        phone = excluded.phone,
        avatar_path = excluded.avatar_path,
        lead_source = excluded.lead_source,
        referral_name = excluded.referral_name,
        primary_goal = excluded.primary_goal,
        completed_at = now()
    `;

    await db`
      update public.site_access_users
      set full_name = ${preferredName}, must_change_password = false, onboarding_completed_at = now()
      where user_id = ${profileUserId}
    `;

    return json({
      data: {
        profile: rows[0],
        user: { id: profileUserId, email },
        siteAccess: { mustChangePassword: false, onboardingCompleted: true },
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
