'use client';

import { Icon } from '@/components/ui/icon';
import { authClient } from '@/lib/auth/client';
import { getBrandStyle, getOrganizationAssetUrl, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';

type Invitation = {
  email: string;
  role: 'recruiter' | 'viewer';
  expires_at: string;
  organization: OrganizationBrand;
};

export function InvitationClient({ token }: { token: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/invitations/${token}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Convite indisponível.');
        setInvitation(payload.data.invitation);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Convite indisponível.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation) return;
    setError('');
    setSubmitting(true);
    try {
      const result = mode === 'signup'
        ? await authClient.signUp.email({ email: invitation.email, password, name, fetchOptions: { headers: { 'x-majurh-invitation-token': token } } })
        : await authClient.signIn.email({ email: invitation.email, password });
      if (result.error) {
        setError(authErrorMessage(result.error, mode));
        return;
      }

      const acceptResponse = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name || invitation.email.split('@')[0] }),
      });
      const acceptPayload = await acceptResponse.json();
      if (!acceptResponse.ok) {
        setError(acceptPayload.error || 'Não foi possível concluir o convite.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error && submitError.message.includes('Variável de ambiente') ? 'O Neon Auth ainda não está configurado neste ambiente.' : 'Não foi possível concluir o convite. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const brand = invitation?.organization ?? null;
  if (loading) return <main className="invitation-page"><div className="loading-state">Validando convite</div></main>;
  if (!invitation || !brand) return <main className="invitation-page"><section className="invite-invalid panel"><div className="access-pending-icon"><Icon name="rotate-ccw" size={20} /></div><p className="eyebrow">Convite</p><h1>Este link não está disponível.</h1><p>{error || 'Solicite um novo convite ao administrador da organização.'}</p><a className="button button-primary" href="/login">Ir para o login</a></section></main>;

  return (
    <main className="login-page invitation-page" style={getBrandStyle(brand) as CSSProperties}>
      <section className="login-form-side"><div className="login-form-wrap">
        <div className="login-brand"><div className="brand-mark brand-mark-logo"><img src={getOrganizationAssetUrl(brand, 'logo') || platformBrand.logoPath} alt="" /></div><strong>{brand.name}</strong></div>
        <p className="eyebrow">Convite de acesso</p>
        <h1>Entre no espaço da sua equipe.</h1>
        <p>Crie seu acesso para trabalhar com candidatos, processos e documentos em {brand.name}.</p>
        <div className="invite-recipient"><span>Convite enviado para</span><strong>{invitation.email}</strong><small>{roleLabel(invitation.role)} · válido até {formatDate(invitation.expires_at)}</small></div>
        <form className="login-form" onSubmit={submit}>
          {mode === 'signup' && <div className="field"><label htmlFor="invite-name">Nome completo</label><input className="form-input" id="invite-name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome completo" /></div>}
          <div className="field"><label htmlFor="invite-password">{mode === 'signup' ? 'Crie sua senha' : 'Senha'}</label><input className="form-input" id="invite-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'Pelo menos 8 caracteres' : 'Digite sua senha'} /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={submitting}>{submitting ? 'Concluindo…' : mode === 'signup' ? 'Criar meu acesso' : 'Entrar e aceitar'}<Icon name="arrow-up-right" size={16} /></button>
        </form>
        <button type="button" className="login-mode-toggle" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>{mode === 'signup' ? 'Já tenho uma conta? Entrar' : 'Ainda não tenho senha? Criar acesso'}</button>
      </div></section>
      <aside className={`login-side-art ${brand.brand_login_banner_path ? 'has-custom-banner' : ''}`} style={loginArtStyle(brand)}><div className="art-content"><span className="art-kicker">{brand.brand_login_kicker || `${brand.name} · B2B`}</span><h2>{brand.brand_login_headline || 'Um espaço criado para trabalhar em equipe.'}</h2><p>{brand.brand_login_description || 'Acesso organizado, contexto compartilhado e próximos passos claros.'}</p><div className="art-trail"><div className="art-step"><span className="art-step-dot" />Convite validado</div><div className="art-step"><span className="art-step-dot" />Perfil conectado</div><div className="art-step"><span className="art-step-dot" />Equipe pronta</div></div></div></aside>
    </main>
  );
}

function roleLabel(role: string) { return role === 'viewer' ? 'Visualizador' : 'Recrutador'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)); }
function authErrorMessage(error: unknown, mode: 'signup' | 'login') {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = error instanceof Error ? error.message.toLowerCase() : typeof details.message === 'string' ? details.message.toLowerCase() : '';
  if (message.includes('already') || message.includes('exists')) return 'Este e-mail já possui uma conta. Use o botão para entrar com sua senha.';
  if (message.includes('password') && (message.includes('short') || message.includes('weak'))) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (message.includes('email')) return 'Informe um e-mail válido.';
  return mode === 'signup' ? 'Não foi possível criar seu acesso. Tente novamente.' : 'Não foi possível entrar com este convite.';
}
function loginArtStyle(organization: OrganizationBrand): CSSProperties {
  const banner = getOrganizationAssetUrl(organization, 'login-banner');
  if (!banner) return {};
  return { backgroundImage: `linear-gradient(180deg, rgba(15, 77, 58, 0.2), rgba(15, 77, 58, 0.82)), url("${banner.replace(/"/g, '')}")`, backgroundPosition: 'center', backgroundSize: 'cover' };
}
