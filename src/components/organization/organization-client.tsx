'use client';

import { Icon } from '@/components/ui/icon';
import { getBrandStyle, getOrganizationAssetUrl, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useEffect, useState, type CSSProperties } from 'react';

type FormState = {
  name: string;
  primaryColor: string;
  accentColor: string;
  kicker: string;
  headline: string;
  description: string;
};

const emptyForm: FormState = { name: '', primaryColor: '', accentColor: '', kicker: '', headline: '', description: '' };

export function OrganizationClient() {
  const [organization, setOrganization] = useState<OrganizationBrand | null>(null);
  const [role, setRole] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loginUrl, setLoginUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'login-banner' | ''>('');
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
        if (current) {
          setForm(toForm(current));
          setLoginUrl(`${window.location.origin}/login?org=${encodeURIComponent(current.slug)}`);
        }
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a organização.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const canManage = role === 'admin';
  const previewOrganization = organization ? { ...organization, brand_primary_color: form.primaryColor, brand_accent_color: form.accentColor } : null;

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
          brandPrimaryColor: form.primaryColor,
          brandAccentColor: form.accentColor,
          brandLoginKicker: form.kicker,
          brandLoginHeadline: form.headline,
          brandLoginDescription: form.description,
        }),
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível salvar a identidade.'); return; }
      const updated = { ...organization, ...(payload.data.organization as OrganizationBrand) };
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

  async function uploadAsset(kind: 'logo' | 'login-banner', file: File | undefined) {
    if (!organization || !canManage || !file) return;
    setUploadingAsset(kind);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('organizationId', organization.id);
      formData.append('kind', kind);
      formData.append('file', file);
      const response = await fetch('/api/organizations/assets', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível enviar o arquivo.'); return; }
      const updated = { ...organization, ...(payload.data.organization as OrganizationBrand) };
      setOrganization(updated);
      window.dispatchEvent(new CustomEvent<OrganizationBrand>('organization:updated', { detail: updated }));
      setMessage(kind === 'logo' ? 'Logo enviada e aplicada.' : 'Banner enviado e aplicado.');
    } catch {
      setError('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setUploadingAsset('');
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
          <div className="panel-header"><div><h2>Identidade da organização</h2><p>Nome, arquivos e cores do ambiente autenticado.</p></div><Icon name="briefcase" /></div>
          <div className="field"><label htmlFor="organization-name">Nome exibido</label><input className="form-input" id="organization-name" value={form.name} onChange={(event) => update('name', event.target.value)} minLength={2} maxLength={120} required disabled={!canManage} /><small>Substitui o nome padrão do Majurh dentro do espaço.</small></div>
          <div className="organization-file-grid">
            <div className="organization-file-field"><div className="field"><label htmlFor="organization-logo">Logo da organização</label><input className="form-input organization-file-input" id="organization-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadAsset('logo', event.target.files?.[0])} disabled={!canManage || uploadingAsset !== ''} /><small>Selecione PNG, JPG, WEBP ou SVG de até 5 MB.</small></div><span className="organization-file-state">{uploadingAsset === 'logo' ? 'Enviando arquivo…' : organization.brand_logo_path ? 'Arquivo salvo no Blob privado.' : 'Usando a logo padrão do Majurh.'}</span></div>
            <div className="organization-file-field"><div className="field"><label htmlFor="login-banner">Banner da tela de login</label><input className="form-input organization-file-input" id="login-banner" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadAsset('login-banner', event.target.files?.[0])} disabled={!canManage || uploadingAsset !== ''} /><small>Selecione PNG, JPG, WEBP ou SVG de até 5 MB.</small></div><span className="organization-file-state">{uploadingAsset === 'login-banner' ? 'Enviando arquivo…' : organization.brand_login_banner_path ? 'Arquivo salvo no Blob privado.' : 'Usando a composição padrão.'}</span></div>
          </div>
          <div className="brand-color-grid"><div className="field"><label htmlFor="organization-primary">Cor principal</label><div className="brand-color-control"><input type="color" value={hexOrDefault(form.primaryColor, '#4a1119')} onChange={(event) => update('primaryColor', event.target.value)} aria-label="Selecionar cor principal" disabled={!canManage} /><input className="form-input" id="organization-primary" value={form.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} placeholder="#4a1119" disabled={!canManage} /></div></div><div className="field"><label htmlFor="organization-accent">Cor de destaque</label><div className="brand-color-control"><input type="color" value={hexOrDefault(form.accentColor, '#c4512e')} onChange={(event) => update('accentColor', event.target.value)} aria-label="Selecionar cor de destaque" disabled={!canManage} /><input className="form-input" id="organization-accent" value={form.accentColor} onChange={(event) => update('accentColor', event.target.value)} placeholder="#c4512e" disabled={!canManage} /></div></div></div>

          <div className="organization-form-divider"><p className="eyebrow">Tela de login</p><h3>O primeiro contato com sua equipe</h3><p>Personalize os textos exibidos junto do banner. A URL da organização abre essa experiência para quem possui um acesso.</p></div>
          <div className="field"><label htmlFor="login-kicker">Texto de apoio</label><input className="form-input" id="login-kicker" value={form.kicker} onChange={(event) => update('kicker', event.target.value)} maxLength={80} placeholder="Sua empresa · B2B" disabled={!canManage} /></div>
          <div className="field"><label htmlFor="login-headline">Título do banner</label><input className="form-input" id="login-headline" value={form.headline} onChange={(event) => update('headline', event.target.value)} maxLength={140} placeholder="O histórico certo para a próxima decisão." disabled={!canManage} /></div>
          <div className="field"><label htmlFor="login-description">Descrição da tela</label><textarea className="form-textarea" id="login-description" value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={240} placeholder="Uma visão calma do fluxo de pessoas, do primeiro contato à admissão." disabled={!canManage} /></div>
          {canManage && <div className="form-actions"><button className="button button-primary" disabled={saving || uploadingAsset !== ''}>{saving ? 'Salvando identidade…' : 'Salvar alterações'}<Icon name="check" size={16} /></button></div>}
        </form>

        <aside className="organization-preview-wrap"><div className="organization-preview-label">Prévia da tela de login</div><div className="organization-login-preview" style={getBrandStyle(previewOrganization) as CSSProperties}><div className="organization-preview-brand"><div className="brand-mark brand-mark-logo"><img src={getOrganizationAssetUrl(organization, 'logo') || platformBrand.logoPath} alt="" /></div><strong>{form.name || organization.name}</strong></div><div className="organization-preview-art" style={previewBannerStyle(organization)}><span>{form.kicker || `${form.name || organization.name} · B2B`}</span><strong>{form.headline || 'O histórico certo para a próxima decisão.'}</strong><small>{form.description || 'Uma visão calma do fluxo de pessoas, do primeiro contato à admissão.'}</small></div></div><p className="organization-preview-note">Os arquivos selecionados são armazenados no Blob privado e exibidos pela aplicação. A autenticação continua protegida pelo Neon Auth.</p></aside>
      </div>

      <section className="panel organization-access-panel"><div className="panel-header"><div><h2>Equipe e convites</h2><p>Novas pessoas entram somente por um convite criado na administração.</p></div><Icon name="users" /></div><div className="organization-access-row"><div className="access-pending-icon"><Icon name="users" size={20} /></div><div><strong>Gerenciar acessos com segurança</strong><p>Crie links de uso único, escolha o papel de cada pessoa e revogue convites pendentes.</p></div><a className="button button-secondary" href="/administracao">Abrir administração <Icon name="arrow-up-right" size={15} /></a></div></section>
    </div>
  );
}

function toForm(organization: OrganizationBrand): FormState {
  return { name: organization.name, primaryColor: organization.brand_primary_color || '', accentColor: organization.brand_accent_color || '', kicker: organization.brand_login_kicker || '', headline: organization.brand_login_headline || '', description: organization.brand_login_description || '' };
}
function hexOrDefault(value: string, fallback: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
function previewBannerStyle(organization: OrganizationBrand): CSSProperties {
  const banner = getOrganizationAssetUrl(organization, 'login-banner');
  return banner ? { backgroundImage: `linear-gradient(180deg, rgba(15, 77, 58, 0.12), rgba(15, 77, 58, 0.84)), url("${banner}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
}
