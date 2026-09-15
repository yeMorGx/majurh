'use client';

import { Icon } from '@/components/ui/icon';
import { authClient } from '@/lib/auth/client';
import { getBrandStyle, getOrganizationAssetUrl, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';

const defaultLoginLogoPath = '/brand/majurh-dog-mark.svg';
const defaultLoginWordmark = 'Maju RH';

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
  const [showPassword, setShowPassword] = useState(false);
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

  useEffect(() => {
    document.title = organization?.name || defaultLoginWordmark;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = getOrganizationAssetUrl(organization, 'logo') || defaultLoginLogoPath;
    if (!favicon.parentElement) document.head.appendChild(favicon);
  }, [organization]);

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

  const logoPath = getOrganizationAssetUrl(organization, 'logo') || defaultLoginLogoPath;
  const bannerPath = getOrganizationAssetUrl(organization, 'login-banner');
  const hasCustomArtCopy = Boolean(organization?.brand_login_kicker || organization?.brand_login_headline || organization?.brand_login_description);

  return (
    <main className="login-page login-page-reference" style={getBrandStyle(organization) as CSSProperties}>
      <section className="login-form-side login-reference-form-side">
        <div className="login-form-wrap login-reference-form-wrap">
          <div className="login-reference-brand">
            <div className={`login-reference-mark ${organization?.brand_logo_path ? 'is-custom' : ''}`}>
              <img src={logoPath} alt="" />
            </div>
            <span className="login-reference-wordmark">{organization?.name || defaultLoginWordmark}</span>
          </div>
          <p className="eyebrow">Acesso interno</p>
          <h1 className="visually-hidden">{organization?.brand_login_headline || 'Entrar no seu posto de controle.'}</h1>
          <p className="login-reference-tagline">{organization?.brand_login_description || 'Seu controle de contratação'}</p>
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
          <form className="login-form login-reference-form" onSubmit={handleSubmit}>
            <div className="field login-reference-field-group"><label className="login-field-label" htmlFor="email">E-mail corporativo</label><div className="login-reference-field"><input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@empresa.com" /><span className="login-field-icon" aria-hidden="true"><Icon name="mail" size={19} /></span></div></div>
            <div className="field login-reference-field-group"><label className="login-field-label" htmlFor="password">Senha</label><div className="login-reference-field"><input className="form-input" id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" /><button className="login-field-icon login-field-action" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><Icon name={showPassword ? 'eye-off' : 'eye'} size={19} /></button></div></div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary login-reference-submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
          </form>
          <div className="login-alt-methods" role="group" aria-label="Outras formas de login">
            <button className="login-alt-method" type="button" disabled title="Disponível em breve" aria-label="Outra forma de login 1, disponível em breve"><span className="visually-hidden">Em breve</span></button>
            <button className="login-alt-method" type="button" disabled title="Disponível em breve" aria-label="Outra forma de login 2, disponível em breve"><span className="visually-hidden">Em breve</span></button>
            <button className="login-alt-method" type="button" disabled title="Disponível em breve" aria-label="Outra forma de login 3, disponível em breve"><span className="visually-hidden">Em breve</span></button>
            <button className="login-alt-method" type="button" disabled title="Disponível em breve" aria-label="Outra forma de login 4, disponível em breve"><span className="visually-hidden">Em breve</span></button>
          </div>
          <p className="login-access-note">Ainda não tem acesso? Solicite um convite ao administrador da sua organização.</p>
        </div>
      </section>
      <aside className={`login-side-art login-reference-art-side ${bannerPath ? 'has-custom-banner' : ''}`} style={bannerPath ? loginArtStyle(organization) : undefined} aria-label="Imagem de apresentação da plataforma">
        {!bannerPath && <img className="login-reference-art-image" src="/brand/majurh-login-art.png" alt="" />}
        {hasCustomArtCopy && (
          <div className="login-reference-art-copy">
            <span className="art-kicker">{organization?.brand_login_kicker || `${organization?.name || platformBrand.name} · B2B`}</span>
            <h2>{organization?.brand_login_headline || 'O histórico certo para a próxima decisão.'}</h2>
            <p>{organization?.brand_login_description || 'Uma visão calma do fluxo de pessoas, do primeiro contato à admissão.'}</p>
          </div>
        )}
      </aside>
    </main>
  );
}

function loginArtStyle(organization: OrganizationBrand | null): CSSProperties {
  const banner = getOrganizationAssetUrl(organization, 'login-banner');
  if (!banner) return {};
  const safeBanner = banner.replace(/"/g, '');
  return {
    backgroundImage: `url("${safeBanner}")`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  };
}
