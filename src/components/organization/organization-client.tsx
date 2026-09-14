'use client';

import { Icon } from '@/components/ui/icon';
import { getBrandStyle, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type FormState = {
  name: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  bannerUrl: string;
  kicker: string;
  headline: string;
  description: string;
};

const emptyForm: FormState = { name: '', logoUrl: '', primaryColor: '', accentColor: '', bannerUrl: '', kicker: '', headline: '', description: '' };

export function OrganizationClient() {
  const [organization, setOrganization] = useState<OrganizationBrand | null>(null);
  const [role, setRole] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loginUrl, setLoginUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/me', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar a organização.');
        if (!active) return;
        const current = payload.data.organization as OrganizationBrand | null;
        setOrganization(current);
        setRole(payload.data.membership?.role || '');
        if (current) setForm(toForm(current));
        if (current) setLoginUrl(`${window.location.origin}/login?org=${encodeURIComponent(current.slug)}`);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a organização.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const canManage = role === 'admin';
  const previewOrganization = useMemo(() => organization ? ({ ...organization, ...formToBrand(form, organization) }) : null, [form, organization]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !canManage) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          name: form.name,
          brandLogoUrl: form.logoUrl,
          brandPrimaryColor: form.primaryColor,
          brandAccentColor: form.accentColor,
          brandLoginBannerUrl: form.bannerUrl,
          brandLoginKicker: form.kicker,
          brandLoginHeadline: form.headline,
          brandLoginDescription: form.description,
        }),
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível salvar a identidade.'); return; }
      const updated = payload.data.organization as OrganizationBrand;
      setOrganization(updated);
      setForm(toForm(updated));
      setLoginUrl(`${window.location.origin}/login?org=${encodeURIComponent(updated.slug)}`);
      window.dispatchEvent(new CustomEvent<OrganizationBrand>('organization:updated', { detail: updated }));
      setMessage('Identidade e tela de login atualizadas.');
    } catch {
      setError('Não foi possível salvar a identidade. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-state">Carregando organização</div>;
  if (!organization) return <div className="form-error" role="alert">{error || 'Organização não encontrada.'}</div>;

  return (
    <div>
      <div className="page-heading">
        <div><p className="eyebrow">Espaço B2B · {organization.slug}</p><h1>Organização</h1><p>Configure a identidade que sua equipe e as pessoas convidadas vão enxergar.</p></div>
        <div className="heading-actions"><a className="button button-secondary" href={loginUrl || `/login?org=${organization.slug}`} target="_blank" rel="noreferrer">Ver tela de login <Icon name="arrow-up-right" size={15} /></a></div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="form-success" role="status">{message}</div>}
      {!canManage && <div className="setup-callout"><strong>Configuração administrada pelo responsável.</strong><p>Você pode consultar este espaço, mas somente um administrador pode alterar a marca e a tela de login.</p></div>}

      <div className="organization-layout">
        <form className="panel organization-form" onSubmit={save}>
          <div className="panel-header"><div><h2>Identidade da organização</h2><p>Nome, logo e cores do ambiente autenticado.</p></div><Icon name="briefcase" /></div>
          <div className="field"><label htmlFor="organization-name">Nome exibido</label><input className="form-input" id="organization-name" value={form.name} onChange={(event) => update('name', event.target.value)} minLength={2} maxLength={120} required disabled={!canManage} /><small>Substitui o nome padrão do Majurh dentro do espaço.</small></div>
          <div className="field"><label htmlFor="organization-logo">URL da logo</label><input className="form-input" id="organization-logo" type="text" inputMode="url" value={form.logoUrl} onChange={(event) => update('logoUrl', event.target.value)} placeholder="https://empresa.com/logo.svg" disabled={!canManage} /><small>Use uma URL HTTPS ou um caminho local como /logo.svg. Em branco, usa a logo do Majurh.</small></div>
          <div className="brand-color-grid"><div className="field"><label htmlFor="organization-primary">Cor principal</label><div className="brand-color-control"><input type="color" value={hexOrDefault(form.primaryColor, '#0f4d3a')} onChange={(event) => update('primaryColor', event.target.value)} aria-label="Selecionar cor principal" disabled={!canManage} /><input className="form-input" id="organization-primary" value={form.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} placeholder="#0f4d3a" disabled={!canManage} /></div></div><div className="field"><label htmlFor="organization-accent">Cor de destaque</label><div className="brand-color-control"><input type="color" value={hexOrDefault(form.accentColor, '#138a62')} onChange={(event) => update('accentColor', event.target.value)} aria-label="Selecionar cor de destaque" disabled={!canManage} /><input className="form-input" id="organization-accent" value={form.accentColor} onChange={(event) => update('accentColor', event.target.value)} placeholder="#138a62" disabled={!canManage} /></div></div></div>

          <div className="organization-form-divider"><p className="eyebrow">Tela de login</p><h3>O primeiro contato com sua equipe</h3><p>Personalize o conteúdo da área lateral. A URL da organização abre essa experiência para quem já possui um acesso.</p></div>
          <div className="field"><label htmlFor="login-banner">URL do banner ou imagem</label><input className="form-input" id="login-banner" type="text" inputMode="url" value={form.bannerUrl} onChange={(event) => update('bannerUrl', event.target.value)} placeholder="https://empresa.com/banner.jpg" disabled={!canManage} /><small>HTTPS ou caminho local. Em branco, mantém a composição visual da plataforma.</small></div>
          <div className="field"><label htmlFor="login-kicker">Texto de apoio</label><input className="form-input" id="login-kicker" value={form.kicker} onChange={(event) => update('kicker', event.target.value)} maxLength={80} placeholder="Sua empresa · B2B" disabled={!canManage} /></div>
          <div className="field"><label htmlFor="login-headline">Título do banner</label><input className="form-input" id="login-headline" value={form.headline} onChange={(event) => update('headline', event.target.value)} maxLength={140} placeholder="O histórico certo para a próxima decisão." disabled={!canManage} /></div>
          <div className="field"><label htmlFor="login-description">Descrição da tela</label><textarea className="form-textarea" id="login-description" value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={240} placeholder="Uma visão calma do fluxo de pessoas, do primeiro contato à admissão." disabled={!canManage} /></div>
          {canManage && <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Salvando identidade…' : 'Salvar alterações'}<Icon name="check" size={16} /></button></div>}
        </form>

        <aside className="organization-preview-wrap"><div className="organization-preview-label">Prévia da tela de login</div><div className="organization-login-preview" style={getBrandStyle(previewOrganization) as CSSProperties}><div className="organization-preview-brand"><div className="brand-mark brand-mark-logo"><img src={form.logoUrl || platformBrand.logoPath} alt="" /></div><strong>{form.name || organization.name}</strong></div><div className="organization-preview-art" style={previewBannerStyle(form.bannerUrl)}><span>{form.kicker || `${form.name || organization.name} · B2B`}</span><strong>{form.headline || 'O histórico certo para a próxima decisão.'}</strong><small>{form.description || 'Uma visão calma do fluxo de pessoas, do primeiro contato à admissão.'}</small></div></div><p className="organization-preview-note">O link público fica disponível no botão “Ver tela de login”. A autenticação continua protegida pelo Neon Auth.</p></aside>
      </div>

      <section className="panel organization-access-panel"><div className="panel-header"><div><h2>Equipe e convites</h2><p>Novas pessoas entram somente por um convite criado na administração.</p></div><Icon name="users" /></div><div className="organization-access-row"><div className="access-pending-icon"><Icon name="users" size={20} /></div><div><strong>Gerenciar acessos com segurança</strong><p>Crie links de uso único, escolha o papel de cada pessoa e revogue convites pendentes.</p></div><a className="button button-secondary" href="/administracao">Abrir administração <Icon name="arrow-up-right" size={15} /></a></div></section>
    </div>
  );
}

function toForm(organization: OrganizationBrand): FormState {
  return { name: organization.name, logoUrl: organization.brand_logo_url || '', primaryColor: organization.brand_primary_color || '', accentColor: organization.brand_accent_color || '', bannerUrl: organization.brand_login_banner_url || '', kicker: organization.brand_login_kicker || '', headline: organization.brand_login_headline || '', description: organization.brand_login_description || '' };
}
function formToBrand(form: FormState, organization: OrganizationBrand): Partial<OrganizationBrand> { return { name: form.name, brand_logo_url: form.logoUrl, brand_primary_color: form.primaryColor, brand_accent_color: form.accentColor, brand_login_banner_url: form.bannerUrl, brand_login_kicker: form.kicker, brand_login_headline: form.headline, brand_login_description: form.description, id: organization.id, slug: organization.slug }; }
function hexOrDefault(value: string, fallback: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
function previewBannerStyle(url: string): CSSProperties { return url ? { backgroundImage: `linear-gradient(180deg, rgba(15, 77, 58, 0.12), rgba(15, 77, 58, 0.84)), url("${url.replace(/"/g, '')}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}; }
