'use client';

import { Icon } from '@/components/ui/icon';
import { ThreeLogo } from '@/components/brand/three-logo';
import { authClient } from '@/lib/auth/client';
import { getBrandStyle, getOrganizationAssetUrl, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';

const defaultLoginLogoPath = '/brand/majurh-dog-mark.svg';
const defaultLoginWordmark = 'Maju RH';
const loginMethods = [
  { name: 'Google', logo: '/brand/auth-google.svg' },
  { name: 'Microsoft', logo: '/brand/auth-microsoft.svg' },
  { name: 'Sólides', logo: '/brand/auth-solides.svg' },
  { name: 'LinkedIn', logo: '/brand/auth-linkedin.svg' },
] as const;
const commonEmailDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com.br', 'empresa.com.br'];

type PasswordStrength = {
  score: number;
  label: string;
  tone: 'weak' | 'medium' | 'good' | 'strong';
  color: string;
};

function getEmailSuggestions(value: string) {
  const [localPart, typedDomain = ''] = value.trim().toLowerCase().split('@');
  if (!localPart || typedDomain.includes('.')) return [];

  return commonEmailDomains
    .filter((domain) => !typedDomain || domain.startsWith(typedDomain))
    .slice(0, 3);
}

function getPasswordStrength(value: string): PasswordStrength {
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  if (!value) return { score: 0, label: 'Digite sua senha', tone: 'weak', color: '#cdb9b5' };
  if (score <= 1) return { score, label: 'Senha fraca', tone: 'weak', color: '#c44949' };
  if (score === 2) return { score, label: 'Em construção', tone: 'medium', color: '#af651f' };
  if (score === 3) return { score, label: 'Senha boa', tone: 'good', color: '#c4512e' };
  return { score, label: 'Senha forte', tone: 'strong', color: '#3f825f' };
}

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
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
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
      const requestedPath = searchParams.get('redirectedFrom');
      const redirectPath = requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/dashboard';
      router.replace(redirectPath);
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
  const emailSuggestions = getEmailSuggestions(email);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const passwordStrength = getPasswordStrength(password);

  if (loading) {
    return (
      <main className="login-page login-page-reference login-page-loading">
        <div className="login-loading-stage" role="status" aria-live="polite">
          <div className="login-loading-dog">
            <span className="login-loading-orbit" aria-hidden="true" />
            <img src={defaultLoginLogoPath} alt="" />
          </div>
          <span className="visually-hidden">Entrando no seu espaço de trabalho.</span>
        </div>
      </main>
    );
  }

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
            <div className="field login-reference-field-group">
              <label className="login-field-label" htmlFor="email">E-mail corporativo</label>
              <div className={`login-reference-field ${emailLooksValid ? 'is-valid' : email ? 'is-filled' : ''}`}>
                <input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => window.setTimeout(() => setEmailFocused(false), 120)} placeholder="seu.email@empresa.com" />
                <span className="login-field-icon login-email-status" aria-hidden="true"><Icon name={emailLooksValid ? 'check' : 'mail'} size={19} /></span>
              </div>
              {emailFocused && emailSuggestions.length > 0 && (
                <div className="login-email-suggestions" role="listbox" aria-label="Sugestões de domínio">
                  <span className="login-email-suggestions-label">Completar domínio</span>
                  <div className="login-email-suggestions-list">
                    {emailSuggestions.map((domain) => (
                      <button key={domain} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => { const localPart = email.trim().split('@')[0]; setEmail(`${localPart}@${domain}`); setEmailFocused(false); }}>
                        <span>{email.trim().split('@')[0]}@</span>{domain}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {emailLooksValid && <span className="login-field-feedback is-valid"><Icon name="check" size={13} /> Formato reconhecido</span>}
              <span className="visually-hidden" aria-live="polite">{emailLooksValid ? 'E-mail preenchido com formato válido.' : ''}</span>
            </div>
            <div className="field login-reference-field-group">
              <label className="login-field-label" htmlFor="password">Senha</label>
              <div className={`login-reference-field ${password ? `password-strength-${passwordStrength.tone}` : ''}`}>
                <input className="form-input" id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" />
                <button className={`login-field-icon login-field-action login-password-action ${password ? 'has-password' : ''} ${showPassword ? 'is-revealed' : ''}`} type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} style={{ '--strength-color': passwordStrength.color } as CSSProperties}>
                  <span className="login-password-orbit" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, index) => <i key={index} className={`login-password-dot ${index < passwordStrength.score * 2 ? 'is-active' : ''}`} style={{ '--dot-index': index } as CSSProperties} />)}
                  </span>
                  <span className="login-eye-icon"><Icon name={showPassword ? 'eye-off' : 'eye'} size={19} /></span>
                </button>
              </div>
              {password && (
                <div className={`login-password-strength is-${passwordStrength.tone}`} aria-live="polite" style={{ '--strength-color': passwordStrength.color } as CSSProperties}>
                  <span className="login-password-strength-label">Força da senha</span>
                  <strong>{passwordStrength.label}</strong>
                  <span className="login-password-strength-bars" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} className={index < passwordStrength.score ? 'is-active' : ''} />)}</span>
                </div>
              )}
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary login-reference-submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
          </form>
          <div className="login-alt-methods" role="group" aria-label="Outras formas de login">
            {loginMethods.map((method) => (
              <button className="login-alt-method" key={method.name} type="button" disabled title={`${method.name} disponível em breve`} aria-label={`${method.name}, disponível em breve`}>
                <ThreeLogo src={method.logo} alt={`${method.name} logo`} className="login-method-logo" decorative />
                <span className="visually-hidden">{method.name} — disponível em breve</span>
              </button>
            ))}
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
