'use client';

import { Icon } from '@/components/ui/icon';
import { getBrandStyle, getOrganizationAssetUrl, normalizeHex, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

type FormState = {
  name: string;
  primaryColor: string;
  accentColor: string;
  kicker: string;
  headline: string;
  description: string;
};

const emptyForm: FormState = { name: '', primaryColor: '', accentColor: '', kicker: '', headline: '', description: '' };

function publishOrganizationUpdate(organization: OrganizationBrand) {
  window.dispatchEvent(new CustomEvent<OrganizationBrand>('organization:updated', { detail: organization }));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('majurh:organization-updated');
    channel.postMessage(organization);
    channel.close();
  }
}

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
  const organizationRef = useRef<OrganizationBrand | null>(null);
  const formRef = useRef<FormState>(emptyForm);

  useEffect(() => {
    organizationRef.current = organization;
  }, [organization]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

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

  useEffect(() => {
    let active = true;

    function applyLiveOrganization(next: OrganizationBrand | null | undefined) {
      if (!active || !next?.id || organizationRef.current?.id !== next.id) return;

      const currentOrganization = organizationRef.current;
      const draftIsClean = currentOrganization
        && JSON.stringify(formRef.current) === JSON.stringify(toForm(currentOrganization));
      organizationRef.current = next;
      setOrganization(next);
      if (draftIsClean) {
        const nextForm = toForm(next);
        formRef.current = nextForm;
        setForm(nextForm);
      }
      setLoginUrl(`${window.location.origin}/login?org=${encodeURIComponent(next.slug)}`);
    }

    function handleOrganizationUpdated(event: Event) {
      applyLiveOrganization((event as CustomEvent<OrganizationBrand>).detail);
    }

    async function refreshOrganization() {
      try {
        const response = await fetch('/api/me', { cache: 'no-store' });
        const payload = await response.json();
        applyLiveOrganization(payload.data?.organization);
      } catch {
        // Mantém a última prévia se a consulta de atualização falhar.
      }
    }

    window.addEventListener('organization:updated', handleOrganizationUpdated);
    void refreshOrganization();
    const refreshTimer = window.setInterval(() => void refreshOrganization(), 5000);
    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('majurh:organization-updated');
      channel.onmessage = (event: MessageEvent<OrganizationBrand>) => applyLiveOrganization(event.data);
    }

    return () => {
      active = false;
      window.removeEventListener('organization:updated', handleOrganizationUpdated);
      window.clearInterval(refreshTimer);
      channel?.close();
    };
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
      organizationRef.current = updated;
      setOrganization(updated);
      setForm(toForm(updated));
      formRef.current = toForm(updated);
      setLoginUrl(`${window.location.origin}/login?org=${encodeURIComponent(updated.slug)}`);
      publishOrganizationUpdate(updated);
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
      organizationRef.current = updated;
      setOrganization(updated);
      publishOrganizationUpdate(updated);
      setMessage(kind === 'logo' ? 'Logo enviada e aplicada.' : 'Banner enviado e aplicado.');
    } catch {
      setError('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setUploadingAsset('');
    }
  }

  if (loading) return <div className="loading-state">Carregando organização</div>;
  if (!organization) return <div className="form-error" role="alert">{error || 'Organização não encontrada.'}</div>;

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(organization));
  const logo = getOrganizationAssetUrl(organization, 'logo') || platformBrand.logoPath;
  const banner = getOrganizationAssetUrl(organization, 'login-banner') || '/brand/majurh-login-art.png';

  return (
    <div className="brand-studio">
      <header className="studio-heading">
        <div><p className="studio-overline">Seu espaço, sua identidade</p><h1>Organização<span>.</span></h1><p>Uma marca reconhecível em cada encontro com a sua equipe.</p></div>
        <a className="button button-secondary" href={loginUrl} target="_blank" rel="noreferrer"><Icon name="arrow-up-right" />Abrir login</a>
      </header>
      {error && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="form-success" role="status">{message}</div>}
      {!canManage && <p className="studio-notice">Você está no modo de consulta. A edição está disponível para administradores.</p>}
      <form onSubmit={save} className="studio-grid" aria-busy={saving || !!uploadingAsset} style={{ ...getBrandStyle(previewOrganization), '--studio-on-brand': foregroundFor(form.primaryColor) } as CSSProperties}>
        <section className="studio-tile studio-identity">
          <div className="studio-tile-top"><span><Icon name="briefcase" />Identidade</span><span className="studio-tag">/{organization.slug}</span></div>
          <div className="studio-identity-art"><div className="studio-logo-shape"><img src={logo} alt="Logo da organização" /></div><div><span>O lugar da sua equipe</span><strong>{form.name || organization.name}</strong><small>Powered by Maju RH</small></div></div>
          <div className="field"><label htmlFor="organization-name">Nome da organização</label><input className="form-input" id="organization-name" required minLength={2} maxLength={120} value={form.name} disabled={!canManage} onChange={(e) => update('name', e.target.value)} /></div>
          <label className="studio-upload"><Icon name="upload" /><span>{uploadingAsset === 'logo' ? 'Enviando logo…' : 'Trocar logo'}<small>PNG, JPG, WEBP ou SVG · até 5 MB</small></span><input aria-label="Enviar logo da organização" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={!canManage || !!uploadingAsset} onChange={(e) => uploadAsset('logo', e.target.files?.[0])} /></label>
          <p className="studio-help">Os arquivos são aplicados assim que o envio termina.</p>
        </section>

        <section className="studio-tile studio-colors">
          <div className="studio-tile-top"><span><Icon name="settings" />Cores da marca</span></div>
          <h2>Encontre o seu tom.</h2><p>A combinação que acompanha sua equipe pelo espaço.</p>
          <div className="studio-swatches" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="studio-color-fields">
            {([{key:'primaryColor', label:'Principal', fallback:'#4a1119'}, {key:'accentColor',label:'Destaque',fallback:'#c4512e'}] as const).map(({key,label,fallback}) => <label key={key} className="studio-color-field"><span>{label}</span><div><input type="color" aria-label={`Selecionar cor ${label.toLowerCase()}`} value={hexOrDefault(form[key],fallback)} disabled={!canManage} onChange={(e) => update(key,e.target.value)} /><input aria-label={`Código da cor ${label.toLowerCase()}`} value={form[key]} placeholder={fallback} pattern="#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" disabled={!canManage} onChange={(e) => update(key,e.target.value)} /></div></label>)}
          </div>
          <div className="studio-presets"><span>Experimentar</span>{[{name:'Vinho',p:'#4a1119',a:'#c4512e'},{name:'Ameixa',p:'#49335c',a:'#8a5eaa'},{name:'Oceano',p:'#183c53',a:'#317d9c'}].map(p => <button type="button" key={p.name} disabled={!canManage} title={p.name} aria-label={`Aplicar paleta ${p.name}`} style={{background:p.p}} onClick={() => {update('primaryColor',p.p);update('accentColor',p.a);}} />)}</div>
        </section>

        <section className="studio-tile studio-preview">
          <div className="studio-tile-top"><span><Icon name="eye" />Sua porta de entrada</span><span className="studio-tag">{dirty ? 'Prévia · não salva' : 'Prévia'}</span></div>
          <div className="studio-login-mini" aria-label="Prévia ilustrativa do login">
            <div className="studio-login-form"><img src={logo} alt="" /><strong>{form.name || organization.name}</strong><small>Seu controle de contratação</small><span className="studio-mock-field">E-mail corporativo</span><span className="studio-mock-field">••••••••</span><span className="studio-mock-button">Entrar <Icon name="arrow-up-right" size={12} /></span></div>
            <div className="studio-login-image"><img src={banner} alt="Banner do login" />{(form.kicker || form.headline || form.description) && <div><small>{form.kicker}</small><strong>{form.headline}</strong><p>{form.description}</p></div>}</div>
          </div>
          <label className="studio-upload studio-banner-upload"><Icon name="image" /><span>{uploadingAsset === 'login-banner' ? 'Enviando imagem…' : 'Escolher imagem do login'}<small>Arquivo de até 5 MB · envio aplicado imediatamente</small></span><input aria-label="Enviar banner do login" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={!canManage || !!uploadingAsset} onChange={(e) => uploadAsset('login-banner', e.target.files?.[0])} /></label>
        </section>

        <section className="studio-tile studio-copy">
          <div className="studio-tile-top"><span><Icon name="file-text" />Mensagem de boas-vindas</span></div>
          <h2>O primeiro contato conta.</h2>
          <div className="field"><label htmlFor="login-kicker">Texto de apoio</label><input className="form-input" id="login-kicker" value={form.kicker} maxLength={80} placeholder="Bem-vindo à nossa equipe" disabled={!canManage} onChange={(e) => update('kicker',e.target.value)} /></div>
          <div className="field"><label htmlFor="login-headline">Título do banner</label><input className="form-input" id="login-headline" value={form.headline} maxLength={140} placeholder="Pessoas que fazem acontecer." disabled={!canManage} onChange={(e) => update('headline',e.target.value)} /></div>
          <div className="field"><label htmlFor="login-description">Descrição</label><textarea className="form-textarea" id="login-description" value={form.description} maxLength={240} placeholder="Uma mensagem para quem chega." disabled={!canManage} onChange={(e) => update('description',e.target.value)} /></div>
        </section>

        <section className="studio-tile studio-team">
          <div className="studio-team-symbol" aria-hidden="true"><Icon name="users" size={36} /></div><div><span className="studio-overline">Construído em equipe</span><h2>As pessoas fazem o espaço.</h2><p>Convide pessoas e defina o papel de cada uma na organização.</p>{canManage ? <a className="button" href="/administracao">Gerenciar convites <Icon name="arrow-up-right" /></a> : <p>Peça novos convites ao administrador.</p>}</div>
        </section>

        <footer className="studio-savebar"><div><Icon name={dirty ? 'clock' : 'check-circle'} /><span>{saving ? 'Salvando alterações…' : dirty ? 'Você tem alterações para salvar' : 'Identidade atualizada'}<small>Nome, cores e textos são publicados ao salvar.</small></span></div>{canManage && <button className="button button-primary" disabled={!dirty || saving || !!uploadingAsset}>Salvar alterações <Icon name="check" /></button>}</footer>
      </form>
    </div>
  );
}

function toForm(organization: OrganizationBrand): FormState {
  return { name: organization.name, primaryColor: organization.brand_primary_color || '', accentColor: organization.brand_accent_color || '', kicker: organization.brand_login_kicker || '', headline: organization.brand_login_headline || '', description: organization.brand_login_description || '' };
}
function hexOrDefault(value: string, fallback: string) {
  const hex = normalizeHex(value) || fallback;
  return hex.length === 4 ? `#${hex.slice(1).split('').map((char) => char + char).join('')}` : hex;
}

function foregroundFor(value: string) {
  const hex = hexOrDefault(value, '#4a1119');
  const channels = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
