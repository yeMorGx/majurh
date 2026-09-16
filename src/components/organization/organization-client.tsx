'use client';

import { Icon } from '@/components/ui/icon';
import { AvatarGroup, AvatarGroupTooltip } from '@/components/ui/avatar-group';
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
  role: 'admin' | 'manager' | 'recruiter' | 'viewer';
  created_at: string;
  full_name: string;
  presence_status: PresenceStatus;
  presence_updated_at: string | null;
  presence_context: string | null;
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
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'login-banner' | ''>('');
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [customizationTab, setCustomizationTab] = useState<'identity' | 'site'>('identity');
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

    function handlePresenceUpdated(event: Event) {
      const detail = (event as CustomEvent<{ organizationId?: string; status?: PresenceStatus; context?: string | null; updatedAt?: string }>).detail;
      if (detail?.organizationId !== currentOrganizationId || !detail.status) return;
      presenceRef.current = detail.status;
      setPresence(detail.status);
      setMembers((current) => current.map((member) => member.is_current_user ? {
        ...member,
        presence_status: detail.status as PresenceStatus,
        presence_context: detail.context ?? null,
        presence_updated_at: detail.updatedAt ?? new Date().toISOString(),
      } : member));
    }

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
          presenceRef.current = storedStatus;
          setPresence(storedStatus);
          hasLoaded = true;
        }
      } catch (loadError) {
        if (active) setMembersError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as pessoas da organização.');
      } finally {
        if (active) setMembersLoading(false);
      }
    }

    void refreshMembers();
    const refreshTimer = window.setInterval(() => void refreshMembers(), 5000);
    window.addEventListener('presence:updated', handlePresenceUpdated);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('presence:updated', handlePresenceUpdated);
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
  const onlineCount = members.filter((member) => member.presence_status === 'online').length;
  const awayCount = members.filter((member) => member.presence_status === 'away').length;
  const busyCount = members.filter((member) => member.presence_status === 'busy').length;
  const offlineCount = members.filter((member) => member.presence_status === 'offline').length;
  const presenceRate = members.length ? Math.round((onlineCount / members.length) * 100) : 0;
  const visibleMembers = members.filter((member) => member.presence_status !== 'offline').slice(0, 5);

  return (
    <div className="organization-page">
      <header className="organization-page-heading page-heading">
        <div>
          <p className="eyebrow">Espaço da organização</p>
          <h1>{organization.name}</h1>
          <p>Veja quem está por perto e mantenha a identidade do seu ambiente sob controle.</p>
        </div>
        <div className="heading-actions">
          {canManage && <button className="button button-primary" type="button" onClick={() => { setError(''); setMessage(''); setCustomizationTab('identity'); setCustomizationOpen(true); }}><Icon name="settings" />Personalizar</button>}
        </div>
      </header>

      {!customizationOpen && error && <div className="form-error" role="alert">{error}</div>}
      {!customizationOpen && message && <div className="form-success" role="status">{message}</div>}

      <section className="organization-pulse-card" aria-labelledby="organization-pulse-title">
        <div className="organization-pulse-main">
          <div className="organization-pulse-header">
            <div className="organization-pulse-identity">
              <span className="organization-brand-mark"><img src={logo} alt="" /></span>
              <div><span className="organization-pulse-label">Presença do workspace</span><strong>{organization.name}</strong></div>
            </div>
            <span className="organization-live-chip"><i /> Ao vivo</span>
          </div>
          <div className="organization-pulse-reading">
            <div><h2 id="organization-pulse-title">{onlineCount} {onlineCount === 1 ? 'pessoa disponível' : 'pessoas disponíveis'}</h2><p>{members.length ? `${presenceRate}% da equipe está disponível para o próximo movimento.` : 'Adicione pessoas para acompanhar a disponibilidade do time.'}</p></div>
            <div className="organization-presence-meter" role="progressbar" aria-label="Percentual da equipe online" aria-valuemin={0} aria-valuemax={100} aria-valuenow={presenceRate}><span style={{ transform: `scaleX(${presenceRate / 100})` }} /></div>
          </div>
          <div className="organization-pulse-stats">
            <div><span><i className="presence-dot presence-online" />Online</span><strong>{onlineCount}</strong></div>
            <div><span><i className="presence-dot presence-away" />Ausentes</span><strong>{awayCount}</strong></div>
            <div><span><i className="presence-dot presence-busy" />Ocupadas</span><strong>{busyCount}</strong></div>
            <div><span><i className="presence-dot presence-offline" />Offline</span><strong>{offlineCount}</strong></div>
          </div>
        </div>
        <aside className="organization-pulse-side">
          <div className="organization-pulse-side-heading"><span>Quem está aqui</span><span className="organization-pulse-side-count">{onlineCount} agora</span></div>
          {visibleMembers.length ? <AvatarGroup className="organization-pulse-avatars" aria-label="Pessoas presentes">{visibleMembers.map((member) => <div key={member.user_id} className={`organization-pulse-avatar pulse-avatar-${member.presence_status}`} aria-label={`${member.full_name} · ${presenceMeta[member.presence_status].label}`}><span>{initials(member.full_name, member.email)}</span><i className={`presence-dot presence-${member.presence_status}`} /><AvatarGroupTooltip><strong>{member.full_name}</strong><small>{presenceMeta[member.presence_status].label}{member.presence_context ? ` · ${member.presence_context}` : ''}</small></AvatarGroupTooltip></div>)}</AvatarGroup> : <div className="organization-pulse-empty"><Icon name="users" size={20} /><span>Ninguém presente ainda.</span></div>}
          <p>O status considera a atividade recente, o time tracker e compromissos em andamento.</p>
          <a className="organization-pulse-link" href="#organization-members-section">Ver pessoas e status <Icon name="chevron-down" size={14} /></a>
        </aside>
      </section>

      <section className="organization-control-grid" aria-label="Controles da organização">
        <article className="organization-control-card organization-control-identity">
          <div className="organization-control-icon"><Icon name="briefcase" size={19} /></div>
          <div><p className="eyebrow">Identidade</p><h2>{organization.name}</h2><p>Logo, nome e presença oficial da organização em todo o Majurh.</p></div>
          <button className="organization-text-action" type="button" onClick={() => { setCustomizationTab('identity'); setCustomizationOpen(true); }}>Editar identidade <Icon name="arrow-up-right" size={14} /></button>
        </article>
        <article className="organization-control-card organization-control-site">
          <div className="organization-control-icon"><Icon name="eye" size={19} /></div>
          <div><p className="eyebrow">Site de acesso</p><h2>Experiência de entrada</h2><p>Cores, banner e mensagens que aparecem para a sua equipe no login.</p></div>
          <button className="organization-text-action" type="button" onClick={() => { setCustomizationTab('site'); setCustomizationOpen(true); }}>Editar site <Icon name="arrow-up-right" size={14} /></button>
        </article>
        <article className="organization-control-card organization-control-access">
          <div className="organization-control-icon"><Icon name="check-circle" size={19} /></div>
          <div><p className="eyebrow">Acessos</p><h2>Governança do time</h2><p>{members.length} {members.length === 1 ? 'pessoa tem' : 'pessoas têm'} acesso. Papéis e senhas são gerenciados no centro administrativo.</p></div>
          {canManage ? <a className="organization-text-action" href="/administracao">Gerenciar equipe <Icon name="arrow-up-right" size={14} /></a> : <span className="organization-control-note">Somente administradores</span>}
        </article>
      </section>

      <section className="organization-team-productivity panel" aria-labelledby="organization-productivity-title">
        <div className="organization-team-productivity-heading"><div><p className="eyebrow">Ritmo da equipe</p><h2 id="organization-productivity-title">Produtividade do espaço</h2><p>Uma leitura rápida do trabalho compartilhado, separada do seu foco pessoal.</p></div><a className="button button-secondary" href="/produtividade"><Icon name="kanban" size={16} />Abrir produtividade</a></div>
        <div className="organization-productivity-columns"><div><span className="organization-productivity-label">Fluxo do time</span><strong>Kanban compartilhado</strong><small>Organize prioridades e próximos movimentos em conjunto.</small></div><div><span className="organization-productivity-label">Presença</span><strong>{onlineCount} online agora</strong><small>O status é atualizado automaticamente pela atividade do app.</small></div><div><span className="organization-productivity-label">Foco</span><strong>{busyCount} em atividade</strong><small>Time tracker e reuniões aparecem como contexto da pessoa.</small></div></div>
      </section>

      <section id="organization-members-section" className="organization-members-panel panel" aria-labelledby="organization-members-title">
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
          <span className="organization-auto-presence"><i className={`presence-dot presence-${presence}`} />Seu status: <strong>{presenceMeta[presence].label}</strong><small>Atualizado automaticamente</small></span>
        </div>

        {membersError && <div className="form-error organization-members-error" role="alert">{membersError}</div>}
        {membersLoading ? <div className="organization-members-loading" aria-label="Carregando pessoas"><span /><span /><span /></div> : members.length === 0 ? <div className="empty-state"><strong>Nenhuma pessoa encontrada</strong><p>Quando alguém entrar nesta organização, aparecerá aqui.</p></div> : <ul className="organization-member-list">{members.map((member) => <MemberRow key={`${member.user_id}-${member.role}`} member={member} />)}</ul>}
      </section>

      {!canManage && <p className="organization-readonly-note"><Icon name="check-circle" size={17} /><span>Você está no modo de consulta. A personalização da organização fica disponível apenas para administradores.</span></p>}

      {customizationOpen && <div className="modal-backdrop organization-customization-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomizationOpen(false); }}>
        <section className="modal-card organization-customization-modal" role="dialog" aria-modal="true" aria-labelledby="organization-customization-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="organization-modal-header">
            <div className="organization-modal-title"><span className="organization-modal-icon"><Icon name="settings" size={18} /></span><div><p className="eyebrow">White-label</p><h2 id="organization-customization-title">Personalização</h2><p>Separe a identidade institucional da experiência de entrada.</p></div></div>
            <button ref={closeCustomizationRef} className="icon-button" type="button" onClick={() => setCustomizationOpen(false)} aria-label="Fechar personalização"><Icon name="x" size={18} /></button>
          </header>
          {error && <div className="form-error organization-modal-feedback" role="alert">{error}</div>}
          {message && <div className="form-success organization-modal-feedback" role="status">{message}</div>}
          {!canManage && <p className="studio-notice organization-modal-feedback">Você está no modo de consulta. A edição está disponível para administradores.</p>}
          <div className="customization-tabs" role="tablist" aria-label="Área de personalização"><button type="button" className={customizationTab === 'identity' ? 'is-active' : ''} onClick={() => setCustomizationTab('identity')} role="tab" aria-selected={customizationTab === 'identity'}><Icon name="briefcase" size={16} /><span>Identidade da organização<small>Nome, logo e equipe</small></span></button><button type="button" className={customizationTab === 'site' ? 'is-active' : ''} onClick={() => setCustomizationTab('site')} role="tab" aria-selected={customizationTab === 'site'}><Icon name="eye" size={16} /><span>Site de acesso<small>Cores, banner e mensagens</small></span></button></div>
          <CustomizationForm tab={customizationTab} organization={organization} form={form} previewOrganization={previewOrganization} logo={logo} dirty={dirty} canManage={canManage} saving={saving} uploadingAsset={uploadingAsset} onSubmit={save} onUpdate={update} onUploadAsset={uploadAsset} />
        </section>
      </div>}
    </div>
  );
}

function MemberRow({ member }: { member: OrganizationMember }) {
  const status = presenceMeta[member.presence_status];
  return <li className="organization-member-row">
    <div className="member-avatar" aria-hidden="true"><span>{initials(member.full_name, member.email)}</span><i className={`presence-dot presence-${member.presence_status}`} /></div>
    <div className="organization-member-copy"><strong>{member.full_name}{member.is_current_user && <span className="member-you">Você</span>}</strong><span>{member.email || 'E-mail não informado'}</span>{member.presence_context && <small className="member-presence-context">{member.presence_context}</small>}</div>
    <span className={`presence-badge presence-badge-${member.presence_status}`}><i className={`presence-dot presence-${member.presence_status}`} />{status.label}</span>
    <span className="member-role">{roleLabel(member.role)}</span>
  </li>;
}

function CustomizationForm({ tab, organization, form, previewOrganization, logo, dirty, canManage, saving, uploadingAsset, onSubmit, onUpdate, onUploadAsset }: {
  tab: 'identity' | 'site';
  organization: OrganizationBrand;
  form: FormState;
  previewOrganization: OrganizationBrand | null;
  logo: string;
  dirty: boolean;
  canManage: boolean;
  saving: boolean;
  uploadingAsset: 'logo' | 'login-banner' | '';
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: (field: keyof FormState, value: string) => void;
  onUploadAsset: (kind: 'logo' | 'login-banner', file: File | undefined) => void;
}) {
  const banner = getOrganizationAssetUrl(organization, 'login-banner') || '/brand/majurh-login-art.png';
  return <form onSubmit={onSubmit} className="studio-grid organization-customization-form" aria-busy={saving || !!uploadingAsset} style={{ ...getBrandStyle(previewOrganization), '--studio-on-brand': foregroundFor(form.primaryColor) } as CSSProperties}>
    {tab === 'identity' && <>
    <section className="studio-tile studio-identity">
      <div className="studio-tile-top"><span><Icon name="briefcase" />Identidade</span><span className="studio-tag">/{organization.slug}</span></div>
      <div className="studio-identity-art"><div className="studio-logo-shape"><img src={logo} alt="Logo da organização" /></div><div><span>O lugar da sua equipe</span><strong>{form.name || organization.name}</strong><small>Powered by Majurh</small></div></div>
      <div className="field"><label htmlFor="organization-name">Nome da organização</label><input className="form-input" id="organization-name" required minLength={2} maxLength={120} value={form.name} disabled={!canManage} onChange={(event) => onUpdate('name', event.target.value)} /></div>
      <label className="studio-upload"><Icon name="upload" /><span>{uploadingAsset === 'logo' ? 'Enviando logo…' : 'Trocar logo'}<small>PNG, JPG, WEBP ou SVG · até 5 MB</small></span><input aria-label="Enviar logo da organização" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={!canManage || !!uploadingAsset} onChange={(event) => onUploadAsset('logo', event.target.files?.[0])} /></label>
      <p className="studio-help">Os arquivos são aplicados assim que o envio termina.</p>
    </section>

    </>}
    {tab === 'site' && <>
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

    </>}
    <footer className="studio-savebar"><div><Icon name={dirty ? 'clock' : 'check-circle'} /><span>{saving ? 'Salvando alterações…' : dirty ? 'Você tem alterações para salvar' : 'Identidade atualizada'}<small>Nome, cores e textos são publicados ao salvar.</small></span></div>{canManage && <button className="button button-primary" disabled={!dirty || saving || !!uploadingAsset}>Salvar alterações <Icon name="check" /></button>}</footer>
  </form>;
}

function roleLabel(role: string) {
  return role === 'admin' ? 'Administrador' : role === 'manager' ? 'Gerente' : role === 'viewer' ? 'Visualizador' : 'Equipe RH';
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
