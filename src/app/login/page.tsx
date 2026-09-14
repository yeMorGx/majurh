'use client';

import { Icon } from '@/components/ui/icon';
import { authClient } from '@/lib/auth/client';
import { getBrandStyle, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';

function isVercelPreviewDeployment() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  return hostname.endsWith('.vercel.app') && hostname !== 'majurh.vercel.app';
}

function authErrorMessage(error: unknown) {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : '';
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof details.message === 'string'
      ? details.message.toLowerCase()
      : '';

  if (isVercelPreviewDeployment()) {
    return 'Este link de preview está protegido pelo Vercel. Abra https://majurh.vercel.app para acessar sua conta.';
  }

  if (code.includes('already') || message.includes('already registered') || message.includes('already exists')) {
    return 'Este e-mail já possui um acesso. Confira a senha ou use a recuperação de acesso.';
  }

  if (code.includes('invalid_email') || message.includes('invalid email')) {
    return 'Informe um e-mail válido.';
  }

  const weakPassword = code.includes('password') && (code.includes('short') || code.includes('weak'))
    || message.includes('password') && (message.includes('short') || message.includes('weak') || message.includes('security'));
  if (weakPassword) {
    return 'A senha precisa ter pelo menos 8 caracteres e atender aos requisitos de segurança.';
  }

  if (code.includes('email_not_confirmed') || message.includes('verification required') || message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique também a caixa de spam.';
  }

  return 'Não foi possível entrar. Confira seu e-mail e senha.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState<OrganizationBrand | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configurationMissing, setConfigurationMissing] = useState(false);
  const [previewDeployment, setPreviewDeployment] = useState(false);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('org')?.trim();
    setConfigurationMissing(
      new URLSearchParams(window.location.search).get('configuration') === 'missing',
    );
    setPreviewDeployment(isVercelPreviewDeployment());
    if (!slug) return;

    fetch(`/api/branding?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setOrganization(payload?.data?.organization ?? null))
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(authErrorMessage(result.error));
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message.includes('Variável de ambiente') ? 'O Neon Auth ainda não está configurado neste ambiente.' : authErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" style={getBrandStyle(organization) as CSSProperties}>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-brand"><div className="brand-mark brand-mark-logo"><img src={organization?.brand_logo_url || platformBrand.logoPath} alt="" /></div><strong>{organization?.name || platformBrand.name}</strong></div>
          <p className="eyebrow">Acesso interno</p>
          <h1>Entrar no seu posto de controle.</h1>
          <p>{organization?.brand_login_description || platformBrand.description}</p>
          {organization && <div className="login-tenant-note">Acesso por convite de {organization.name}.</div>}
          {configurationMissing && (
            <div className="form-error" role="alert">
              O ambiente de produção ainda não está conectado ao Neon Auth. Configure as variáveis do Neon na Vercel e publique novamente.
            </div>
          )}
          {previewDeployment && (
            <div className="setup-callout" role="status">
              <strong>Você está em um link de preview protegido.</strong>
              <p>Para criar ou acessar sua conta, use o domínio oficial:</p>
              <a className="text-link" href="https://majurh.vercel.app/login">Abrir majurh.vercel.app <Icon name="arrow-up-right" size={14} /></a>
            </div>
          )}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field"><label htmlFor="email">E-mail</label><input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" /></div>
            <div className="field"><label htmlFor="password">Senha</label><input className="form-input" id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" /></div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}<Icon name="arrow-up-right" size={16} /></button>
          </form>
          <p className="login-access-note">Ainda não tem acesso? Solicite um convite ao administrador da sua organização.</p>
        </div>
      </section>
      <aside className={`login-side-art ${organization?.brand_login_banner_url ? 'has-custom-banner' : ''}`} style={loginArtStyle(organization)}><div className="art-content"><span className="art-kicker">{organization?.brand_login_kicker || `${organization?.name || platformBrand.name} · B2B`}</span><h2>{organization?.brand_login_headline || 'O histórico certo para a próxima decisão.'}</h2><p>{organization?.brand_login_description || 'Uma visão calma do fluxo de pessoas, do primeiro contato à admissão.'}</p><div className="art-trail"><div className="art-step"><span className="art-step-dot" />Candidato identificado</div><div className="art-step"><span className="art-step-dot" />Processo em andamento</div><div className="art-step"><span className="art-step-dot" />Próximo passo claro</div></div></div></aside>
    </main>
  );
}

function loginArtStyle(organization: OrganizationBrand | null): CSSProperties {
  const banner = organization?.brand_login_banner_url;
  if (!banner) return {};
  const safeBanner = banner.replace(/"/g, '');
  return {
    backgroundImage: `linear-gradient(180deg, rgba(15, 77, 58, 0.2), rgba(15, 77, 58, 0.82)), url("${safeBanner}")`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  };
}
