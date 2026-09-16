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

type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

type OrganizationMember = {
  user_id: string;
  email: string | null;
  role: 'admin' | 'recruiter' | 'viewer';
  created_at: string;
  full_name: string;
  presence_status: PresenceStatus;
  presence_updated_at: string | null;
  is_current_user: boolean;
};

const emptyForm: FormState = { name: '', primaryColor: '', accentColor: '', kicker: '', headline: '', description: '' };

const presenceMeta: Record<PresenceStatus, { label: string; description: string }> = {
  online: { label: 'Online', description: 'Disponível agora' },
  offline: { label: 'Offline', description: 'Fora do espaço' },
  away: { label: 'Ausente', description: 'Retorna em breve' },
  busy: { label: 'Ocupado', description: 'Não quer ser interrompido' },
};

const presenceOptions: PresenceStatus[] = ['online', 'away', 'busy', 'offline'];

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
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [presence, setPresence] = useState<PresenceStatus>('offline');
  const [loginUrl, setLoginUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'login-banner' | ''>('');
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [error, setError] = useState('');
  const [membersError, setMembersError] = useState('');
  const [message, setMessage] = useState('');
  const organizationRef = useRef<OrganizationBrand | null>(null);
  const formRef = useRef<FormState>(emptyForm);
  const presenceRef = useRef<PresenceStatus>('offline');
  const closeCustomizationRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    organizationRef.current = organization;
  }, [organization]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    presenceRef.current = presence;
  }, [presence]);

  useEffect(() => {
    let active = true;
    fetch('/api/me', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar a organização.');
        if (!active) return;
        const current = payload.data.organization as OrganizationBrand | null;
        organizationRef.current = current;
        setOrganization(current);
        setRole(payload.data.membership?.role || '');
        if (current) {
          const nextForm = toForm(current);
          formRef.current = nextForm;
          setForm(nextForm);
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
        // Mantém a última identidade se a consulta de atualização falhar.
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

  useEffect(() => {
    const organizationId = organization?.id;
    if (!organizationId) return;
    const currentOrganizationId = organizationId;

    let active = true;
    let hasLoaded = false;

    async function refreshMembers() {
      try {
        const response = await fetch(`/api/organizations/members?organizationId=${encodeURIComponent(currentOrganizationId)}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar as pessoas da organização.');
        if (!active) return;

        const nextMembers = (payload.data?.members ?? []) as OrganizationMember[];
        setMembers(nextMembers);
        setMembersError('');
        if (!hasLoaded) {
          const currentMember = nextMembers.find((member) => member.is_current_user);
          const storedStatus = currentMember?.presence_status ?? 'offline';
          const initialStatus = storedStatus === 'offline' ? 'online' : storedStatus;
          presenceRef.current = storedStatus;
          setPresence(storedStatus);
          hasLoaded = true;

          if (initialStatus !== storedStatus) {
            try {
              const presenceResponse = await fetch('/api/organizations/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: currentOrganizationId, status: initialStatus }),
              });
              if (presenceResponse.ok && active) {
                presenceRef.current = initialStatus;
                setPresence(initialStatus);
                updateMemberStatus(setMembers, currentMember?.user_id, initialStatus);
              }
            } catch {
              // Uma falha de presença não impede o carregamento da organização.
            }
          }
        }
      } catch (loadError) {
        if (active) setMembersError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as pessoas da organização.');
      } finally {
        if (active) setMembersLoading(false);
      }
    }

    void refreshMembers();
    const refreshTimer = window.setInterval(() => void refreshMembers(), 20000);
    const heartbeatTimer = window.setInterval(() => {
      void fetch('/api/organizations/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, status: presenceRef.current }),
      });
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.clearInterval(heartbeatTimer);
    };
  }, [organization?.id]);

  useEffect(() => {
    if (!customizationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCustomizationOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    closeCustomizationRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [customizationOpen]);

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
      const nextForm = toForm(updated);
      formRef.current = nextForm;
      setForm(nextForm);
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

  async function updatePresence(nextStatus: PresenceStatus) {
    if (!organization || nextStatus === presence || presenceSaving) return;
    const previousStatus = presenceRef.current;
    presenceRef.current = nextStatus;
    setPresence(nextStatus);
    setPresenceSaving(true);
    setMembersError('');
    try {
      const response = await fetch('/api/organizations/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível atualizar seu status.');
      const currentMember = members.find((member) => member.is_current_user);
      updateMemberStatus(setMembers, currentMember?.user_id, nextStatus);
    } catch (presenceError) {
      presenceRef.current = previousStatus;
      setPresence(previousStatus);
      setMembersError(presenceError instanceof Error ? presenceError.message : 'Não foi possível atualizar seu status.');
    } finally {
      setPresenceSaving(false);
    }
  }

  if (loading) return <div className="loading-state">Carregando organização</div>;
  if (!organization) return <div className="form-error" role="alert">{error || 'Organização não encontrada.'}</div>;

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(organization));
  const logo = getOrganizationAssetUrl(organization, 'logo') || platformBrand.logoPath;
  const onlineCount = members.filter((member) => member.presence_status === 'online').length;
  const currentMember = members.find((member) => member.is_current_user);

  return (
    <div className="organization-page">
      <header className="organization-page-heading page-heading">
        <div>
          <p className="eyebrow">Espaço da organização</p>
          <h1>{organization.name}</h1>
          <p>Veja quem está por perto e mantenha a identidade do seu ambiente sob controle.</p>
        </div>
        <div className="heading-actions">
          <a className="button button-secondary" href={loginUrl} target="_blank" rel="noreferrer"><Icon name="arrow-up-right" />Abrir login</a>
          {canManage && <button className="button button-primary" type="button" onClick={() => { setError(''); setMessage(''); setCustomizationOpen(true); }}><Icon name="settings" />Personalizar</button>}
        </div>
      </header>

      {!customizationOpen && error && <div className="form-error" role="alert">{error}</div>}
      {!customizationOpen && message && <div className="form-success" role="status">{message}</div>}

      <section className="organization-overview-banner">
        <div className="organization-overview-copy">
          <div className="organization-brand-chip"><span className="organization-brand-mark"><img src={logo} alt="" /></span><span>Workspace ativo</span></div>
          <h2>Um espaço feito para as pessoas.</h2>
          <p>Organize o trabalho do RH em um ambiente que tenha a cara da sua organização e deixe claro quem está disponível.</p>
          <div className="organization-overview-meta">
            <div><span>Endereço</span><strong>/{organization.slug}</strong></div>
            <div><span>Acesso</span><strong>{roleLabel(role)}</strong></div>
            <div><span>Agora</span><strong>{onlineCount} {onlineCount === 1 ? 'pessoa online' : 'pessoas online'}</strong></div>
          </div>
        </div>
        <div className="organization-overview-art" aria-hidden="true"><span className="organization-orbit organization-orbit-large" /><span className="organization-orbit organization-orbit-small" /><span className="organization-overview-art-card"><img src={logo} alt="" /><strong>{organization.name}</strong><small>Equipe em movimento</small><i /></span></div>
      </section>

      <section className="organization-members-panel panel" aria-labelledby="organization-members-title">
        <div className="organization-members-header">
          <div className="organization-members-title">
            <span className="organization-section-icon"><Icon name="users" size={19} /></span>
            <div><p className="eyebrow">Equipe da organização</p><h2 id="organization-members-title">Pessoas do espaço</h2><p>Um retrato rápido de quem pode acessar este ambiente.</p></div>
          </div>
          <div className="organization-members-count"><strong>{members.length}</strong><span>{members.length === 1 ? 'pessoa' : 'pessoas'}</span></div>
        </div>

        <div className="organization-presence-toolbar">
          <div className="organization-presence-summary" aria-label="Resumo dos status da equipe">
            {presenceOptions.map((status) => <span key={status}><i className={`presence-dot presence-${status}`} />{members.filter((member) => member.presence_status === status).length} {presenceMeta[status].label.toLowerCase()}</span>)}
          </div>
          {currentMember && <label className="organization-own-presence"><span>Seu status</span><select className="filter-select" value={presence} disabled={presenceSaving} onChange={(event) => updatePresence(event.target.value as PresenceStatus)}>{presenceOptions.map((status) => <option value={status} key={status}>{presenceMeta[status].label}</option>)}</select></label>}
        </div>

        {membersError && <div className="form-error organization-members-error" role="alert">{membersError}</div>}
        {membersLoading ? <div className="organization-members-loading" aria-label="Carregando pessoas"><span /><span /><span /></div> : members.length === 0 ? <div className="empty-state"><strong>Nenhuma pessoa encontrada</strong><p>Quando alguém entrar nesta organização, aparecerá aqui.</p></div> : <ul className="organization-member-list">{members.map((member) => <MemberRow key={`${member.user_id}-${member.role}`} member={member} />)}</ul>}
      </section>

      {!canManage && <p className="organization-readonly-note"><Icon name="check-circle" size={17} /><span>Você está no modo de consulta. A personalização da organização fica disponível apenas para administradores.</span></p>}

      {customizationOpen && <div className="modal-backdrop organization-customization-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomizationOpen(false); }}>
        <section className="modal-card organization-customization-modal" role="dialog" aria-modal="true" aria-labelledby="organization-customization-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="organization-modal-header">
            <div className="organization-modal-title"><span className="organization-modal-icon"><Icon name="settings" size={18} /></span><div><p className="eyebrow">White-label</p><h2 id="organization-customization-title">Personalização</h2><p>Altere a presença da sua marca no espaço e na tela de login.</p></div></div>
            <button ref={closeCustomizationRef} className="icon-button" type="button" onClick={() => setCustomizationOpen(false)} aria-label="Fechar personalização"><Icon name="x" size={18} /></button>
          </header>
          {error && <div className="form-error organization-modal-feedback" role="alert">{error}</div>}
          {message && <div className="form-success organization-modal-feedback" role="status">{message}</div>}
          {!canManage && <p className="studio-notice organization-modal-feedback">Você está no modo de consulta. A edição está disponível para administradores.</p>}
          <CustomizationForm organization={organization} form={form} previewOrganization={previewOrganization} logo={logo} dirty={dirty} loginUrl={loginUrl} canManage={canManage} saving={saving} uploadingAsset={uploadingAsset} onSubmit={save} onUpdate={update} onUploadAsset={uploadAsset} />
        </section>
      </div>}
    </div>
  );
}

function MemberRow({ member }: { member: OrganizationMember }) {
  const status = presenceMeta[member.presence_status];
  return <li className="organization-member-row">
    <div className="member-avatar" aria-hidden="true"><span>{initials(member.full_name, member.email)}</span><i className={`presence-dot presence-${member.presence_status}`} /></div>
    <div className="organization-member-copy"><strong>{member.full_name}{member.is_current_user && <span className="member-you">Você</span>}</strong><span>{member.email || 'E-mail não informado'}</span></div>
    <span className={`presence-badge presence-badge-${member.presence_status}`}><i className={`presence-dot presence-${member.presence_status}`} />{status.label}</span>
    <span className="member-role">{roleLabel(member.role)}</span>
  </li>;
}

function CustomizationForm({ organization, form, previewOrganization, logo, dirty, loginUrl, canManage, saving, uploadingAsset, onSubmit, onUpdate, onUploadAsset }: {
  organization: OrganizationBrand;
  form: FormState;
  previewOrganization: OrganizationBrand | null;
  logo: string;
  dirty: boolean;
  loginUrl: string;
  canManage: boolean;
  saving: boolean;
  uploadingAsset: 'logo' | 'login-banner' | '';
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: (field: keyof FormState, value: string) => void;
  onUploadAsset: (kind: 'logo' | 'login-banner', file: File | undefined) => void;
}) {
  const banner = getOrganizationAssetUrl(organization, 'login-banner') || '/brand/majurh-login-art.png';
  return <form onSubmit={onSubmit} className="studio-grid organization-customization-form" aria-busy={saving || !!uploadingAsset} style={{ ...getBrandStyle(previewOrganization), '--studio-on-brand': foregroundFor(form.primaryColor) } as CSSProperties}>
    <section className="studio-tile studio-identity">
      <div className="studio-tile-top"><span><Icon name="briefcase" />Identidade</span><span className="studio-tag">/{organization.slug}</span></div>
      <div className="studio-identity-art"><div className="studio-logo-shape"><img src={logo} alt="Logo da organização" /></div><div><span>O lugar da sua equipe</span><strong>{form.name || organization.name}</strong><small>Powered by Majurh</small></div></div>
      <div className="field"><label htmlFor="organization-name">Nome da organização</label><input className="form-input" id="organization-name" required minLength={2} maxLength={120} value={form.name} disabled={!canManage} onChange={(event) => onUpdate('name', event.target.value)} /></div>
      <label className="studio-upload"><Icon name="upload" /><span>{uploadingAsset === 'logo' ? 'Enviando logo…' : 'Trocar logo'}<small>PNG, JPG, WEBP ou SVG · até 5 MB</small></span><input aria-label="Enviar logo da organização" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={!canManage || !!uploadingAsset} onChange={(event) => onUploadAsset('logo', event.target.files?.[0])} /></label>
      <p className="studio-help">Os arquivos são aplicados assim que o envio termina.</p>
    </section>

    <section className="studio-tile studio-colors">
      <div className="studio-tile-top"><span><Icon name="settings" />Cores da marca</span></div>
      <h2>Encontre o seu tom.</h2><p>A combinação que acompanha sua equipe pelo espaço.</p>
      <div className="studio-swatches" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="studio-color-fields">{([{ key: 'primaryColor', label: 'Principal', fallback: '#4a1119' }, { key: 'accentColor', label: 'Destaque', fallback: '#c4512e' }] as const).map(({ key, label, fallback }) => <label key={key} className="studio-color-field"><span>{label}</span><div><input type="color" aria-label={`Selecionar cor ${label.toLowerCase()}`} value={hexOrDefault(form[key], fallback)} disabled={!canManage} onChange={(event) => onUpdate(key, event.target.value)} /><input aria-label={`Código da cor ${label.toLowerCase()}`} value={form[key]} placeholder={fallback} pattern="#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" disabled={!canManage} onChange={(event) => onUpdate(key, event.target.value)} /></div></label>)}</div>
      <div className="studio-presets"><span>Experimentar</span>{[{ name: 'Vinho', p: '#4a1119', a: '#c4512e' }, { name: 'Ameixa', p: '#49335c', a: '#8a5eaa' }, { name: 'Oceano', p: '#183c53', a: '#317d9c' }].map((preset) => <button type="button" key={preset.name} disabled={!canManage} title={preset.name} aria-label={`Aplicar paleta ${preset.name}`} style={{ background: preset.p }} onClick={() => { onUpdate('primaryColor', preset.p); onUpdate('accentColor', preset.a); }} />)}</div>
    </section>

    <section className="studio-tile studio-preview">
      <div className="studio-tile-top"><span><Icon name="eye" />Sua porta de entrada</span><span className="studio-tag">{dirty ? 'Prévia · não salva' : 'Prévia'}</span></div>
      <div className="studio-login-mini" aria-label="Prévia ilustrativa do login"><div className="studio-login-form"><img src={logo} alt="" /><strong>{form.name || organization.name}</strong><small>Seu controle de contratação</small><span className="studio-mock-field">E-mail corporativo</span><span className="studio-mock-field">••••••••</span><span className="studio-mock-button">Entrar <Icon name="arrow-up-right" size={12} /></span></div><div className="studio-login-image"><img src={banner} alt="Banner do login" />{(form.kicker || form.headline || form.description) && <div><small>{form.kicker}</small><strong>{form.headline}</strong><p>{form.description}</p></div>}</div></div>
      <label className="studio-upload studio-banner-upload"><Icon name="image" /><span>{uploadingAsset === 'login-banner' ? 'Enviando imagem…' : 'Escolher imagem do login'}<small>Arquivo de até 5 MB · envio aplicado imediatamente</small></span><input aria-label="Enviar banner do login" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={!canManage || !!uploadingAsset} onChange={(event) => onUploadAsset('login-banner', event.target.files?.[0])} /></label>
    </section>

    <section className="studio-tile studio-copy">
      <div className="studio-tile-top"><span><Icon name="file-text" />Mensagem de boas-vindas</span></div>
      <h2>O primeiro contato conta.</h2>
      <div className="field"><label htmlFor="login-kicker">Texto de apoio</label><input className="form-input" id="login-kicker" value={form.kicker} maxLength={80} placeholder="Bem-vindo à nossa equipe" disabled={!canManage} onChange={(event) => onUpdate('kicker', event.target.value)} /></div>
      <div className="field"><label htmlFor="login-headline">Título do banner</label><input className="form-input" id="login-headline" value={form.headline} maxLength={140} placeholder="Pessoas que fazem acontecer." disabled={!canManage} onChange={(event) => onUpdate('headline', event.target.value)} /></div>
      <div className="field"><label htmlFor="login-description">Descrição</label><textarea className="form-textarea" id="login-description" value={form.description} maxLength={240} placeholder="Uma mensagem para quem chega." disabled={!canManage} onChange={(event) => onUpdate('description', event.target.value)} /></div>
    </section>

    <section className="studio-tile studio-team"><div className="studio-team-symbol" aria-hidden="true"><Icon name="users" size={36} /></div><div><span className="studio-overline">Construído em equipe</span><h2>As pessoas fazem o espaço.</h2><p>Convide pessoas e defina o papel de cada uma na organização.</p>{canManage ? <a className="button" href="/administracao">Gerenciar convites <Icon name="arrow-up-right" /></a> : <p>Peça novos convites ao administrador.</p>}</div></section>

    <footer className="studio-savebar"><div><Icon name={dirty ? 'clock' : 'check-circle'} /><span>{saving ? 'Salvando alterações…' : dirty ? 'Você tem alterações para salvar' : 'Identidade atualizada'}<small>Nome, cores e textos são publicados ao salvar.</small></span></div>{canManage && <button className="button button-primary" disabled={!dirty || saving || !!uploadingAsset}>Salvar alterações <Icon name="check" /></button>}</footer>
    <a className="organization-modal-login-link" href={loginUrl} target="_blank" rel="noreferrer">Abrir a tela de login em uma nova aba <Icon name="arrow-up-right" size={14} /></a>
  </form>;
}

function updateMemberStatus(setMembers: React.Dispatch<React.SetStateAction<OrganizationMember[]>>, userId: string | undefined, status: PresenceStatus) {
  if (!userId) return;
  setMembers((current) => current.map((member) => member.user_id === userId ? { ...member, presence_status: status, presence_updated_at: new Date().toISOString() } : member));
}

function roleLabel(role: string) {
  return role === 'admin' ? 'Administrador' : role === 'viewer' ? 'Visualizador' : 'Equipe RH';
}

function initials(name: string, email: string | null) {
  const source = name.trim() || email?.split('@')[0] || 'M';
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}` : source.slice(0, 2)).toUpperCase();
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
