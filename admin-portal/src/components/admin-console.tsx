'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Tab = 'overview' | 'users' | 'analytics' | 'site';
type Member = { user_id: string; email: string; full_name: string; is_active: boolean; created_at: string };
type SiteSettings = { available: boolean; maintenanceMode: boolean; publicSiteUrl: string; analyticsPropertyId: string; analyticsMeasurementId: string; updatedAt: string | null };
type Overview = {
  organization: { name: string; slug: string };
  scope: 'global';
  members: Member[];
  metrics: { members: number; candidates: number; processes: number; pending_documents: number };
  site: SiteSettings;
};
type Analytics = { configured: boolean; reason?: string; propertyId?: string; openUrl?: string; daily?: Array<{ date: string; activeUsers: number; sessions: number; events: number }>; totals?: { activeUsers: number; sessions: number; events: number } };

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '' });
  const [siteForm, setSiteForm] = useState<SiteSettings>({ available: false, maintenanceMode: false, publicSiteUrl: '', analyticsPropertyId: '', analyticsMeasurementId: '', updatedAt: null });

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...init, headers, cache: 'no-store' });
    const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload.data as T;
  }

  async function loadOverview() {
    setLoading(true);
    setError('');
    try {
      const data = await request<Overview>('/api/admin/overview');
      setOverview(data);
      setSiteForm(data.site);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o console.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadOverview(); }, []);

  async function loadAnalytics() {
    if (analyticsLoading || analytics) return;
    setAnalyticsLoading(true);
    try { setAnalytics((await request<Analytics>('/api/admin/analytics'))); }
    catch (analyticsError) { setAnalytics({ configured: false, reason: analyticsError instanceof Error ? analyticsError.message : 'Não foi possível consultar o Google Analytics.' }); }
    finally { setAnalyticsLoading(false); }
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setNotice('');
    setError('');
    if (nextTab === 'analytics' && !analytics && !analyticsLoading) void loadAnalytics();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const password = userForm.password || generatePassword();
      await request('/api/admin/users', { method: 'POST', body: JSON.stringify({ name: userForm.name, email: userForm.email, password }) });
      setCreatedCredentials({ name: userForm.name, email: userForm.email, password });
      setUserForm({ name: '', email: '', password: '' });
      setNotice('Acesso geral criado. A pessoa deverá criar a própria organização no primeiro acesso.');
      await loadOverview();
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Não foi possível criar o acesso.'); }
  }

  async function updateMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMember) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    setError('');
    try {
      await request(`/api/admin/users/${editingMember.user_id}`, { method: 'PATCH', body: JSON.stringify(password ? { password } : {}) });
      setEditingMember(null);
      setNotice('Acesso atualizado.');
      await loadOverview();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o acesso.'); }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Revogar o acesso geral de ${member.full_name}? A conta será preservada, mas não poderá iniciar uma sessão ativa no Majurh.`)) return;
    setError('');
    try {
      await request(`/api/admin/users/${member.user_id}`, { method: 'DELETE' });
      setNotice('Acesso geral revogado.');
      await loadOverview();
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover o acesso.'); }
  }

  async function reactivateMember(member: Member) {
    setError('');
    try {
      await request(`/api/admin/users/${member.user_id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
      setNotice('Acesso geral reativado.');
      await loadOverview();
    } catch (reactivateError) { setError(reactivateError instanceof Error ? reactivateError.message : 'Não foi possível reativar o acesso.'); }
  }

  async function saveSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const result = await request<{ available: boolean; settings: SiteSettings }>('/api/admin/site', { method: 'PATCH', body: JSON.stringify({ maintenanceMode: siteForm.maintenanceMode, publicSiteUrl: siteForm.publicSiteUrl, analyticsPropertyId: siteForm.analyticsPropertyId, analyticsMeasurementId: siteForm.analyticsMeasurementId }) });
      setSiteForm(result.settings);
      setNotice('Configurações do site salvas no Neon.');
      setOverview((current) => current ? { ...current, site: result.settings } : current);
    } catch (siteError) { setError(siteError instanceof Error ? siteError.message : 'Não foi possível salvar as configurações.'); }
  }

  async function signOut() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  const memberCountLabel = useMemo(() => `${overview?.metrics.members ?? 0} ${overview?.metrics.members === 1 ? 'pessoa' : 'pessoas'}`, [overview?.metrics.members]);

  if (loading) return <main className="admin-shell admin-loading-shell"><div className="admin-skeleton admin-skeleton-rail" /><div className="admin-loading-main"><div className="admin-skeleton admin-skeleton-line" /><div className="admin-skeleton admin-skeleton-title" /><div className="admin-skeleton admin-skeleton-panel" /></div></main>;

  if (error && !overview) return (
    <main className="admin-auth-error">
      <div className="admin-error-mark">!</div>
      <p className="admin-kicker">Console administrativo</p>
      <h1>Não foi possível abrir este espaço.</h1>
      <p>{error}</p>
      <div className="admin-error-actions"><button className="admin-primary-button" onClick={() => void loadOverview()}>Tentar novamente</button><button className="admin-secondary-button" onClick={() => window.location.assign('/login')}>Voltar ao login</button></div>
    </main>
  );

  const members = overview?.members ?? [];
  return (
    <main className="admin-shell">
      <aside className="admin-rail">
        <div className="admin-rail-brand"><span className="admin-brand-mark" aria-hidden="true">M</span><span>Majurh <small>admin</small></span></div>
        <div className="admin-rail-context"><span>Escopo do console</span><strong>Site inteiro</strong><small>{memberCountLabel} com acesso geral</small></div>
        <nav className="admin-nav" aria-label="Navegação administrativa">
          <NavButton active={tab === 'overview'} onClick={() => selectTab('overview')} label="Visão geral" hint="01" />
          <NavButton active={tab === 'users'} onClick={() => selectTab('users')} label="Usuários" hint="02" />
          <NavButton active={tab === 'analytics'} onClick={() => selectTab('analytics')} label="Google Analytics" hint="03" />
          <NavButton active={tab === 'site'} onClick={() => selectTab('site')} label="Administração do site" hint="04" />
        </nav>
        <div className="admin-rail-footer">{process.env.NEXT_PUBLIC_MAJURH_APP_URL && <button onClick={() => window.location.assign(process.env.NEXT_PUBLIC_MAJURH_APP_URL as string)}>Abrir produto</button>}<button onClick={() => void signOut()}>Sair do console</button></div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar"><div><span className="admin-topbar-label">Console privado</span><span className="admin-topbar-separator">/</span><span>{tabLabel(tab)}</span></div><div className="admin-topbar-actions"><span className="admin-live-status"><i aria-hidden="true" /> Neon conectado</span><button className="admin-text-button" onClick={() => void signOut()}>Sair</button></div></header>
        <div className="admin-content">
          <div className="admin-heading-row"><div><p className="admin-kicker">{overview?.scope === 'global' ? 'Majurh / administração global' : overview?.organization.name || 'Organização'}</p><h1>{headingFor(tab)}</h1><p className="admin-page-intro">{introFor(tab)}</p></div><span className="admin-date-note">Dados protegidos por sessão administrativa</span></div>
          {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
          {notice && <output className="admin-alert admin-alert-success">{notice}</output>}
          {tab === 'overview' && <OverviewPanel overview={overview} onUsers={() => selectTab('users')} onSite={() => selectTab('site')} />}
          {tab === 'users' && <UsersPanel members={members} userForm={userForm} setUserForm={setUserForm} onCreate={createUser} editingMember={editingMember} setEditingMember={setEditingMember} onUpdate={updateMember} onRemove={removeMember} onReactivate={reactivateMember} />}
          {tab === 'analytics' && <AnalyticsPanel analytics={analytics} loading={analyticsLoading} onConfigure={() => selectTab('site')} />}
          {tab === 'site' && <SitePanel site={siteForm} setSite={setSiteForm} onSave={saveSite} />}
        </div>
      </section>
      {createdCredentials && <CredentialsDialog credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />}
    </main>
  );
}

function NavButton({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return <button className={`admin-nav-button ${active ? 'is-active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}><span>{label}</span><small>{hint}</small></button>;
}

function OverviewPanel({ overview, onUsers, onSite }: { overview: Overview | null; onUsers: () => void; onSite: () => void }) {
  const metrics = overview?.metrics ?? { members: 0, candidates: 0, processes: 0, pending_documents: 0 };
  const latest = (overview?.members ?? []).slice(0, 4);
  return <>
    <div className="admin-metric-grid">
      <Metric label="Usuários com acesso" value={metrics.members} caption="acessos gerais ativos no Majurh" />
      <Metric label="Candidatos" value={metrics.candidates} caption="registros no produto principal" />
      <Metric label="Processos" value={metrics.processes} caption="processos seletivos cadastrados" />
      <Metric label="Pendências" value={metrics.pending_documents} caption="documentos que pedem atenção" tone={metrics.pending_documents > 0 ? 'warm' : 'quiet'} />
    </div>
    <div className="admin-overview-grid">
      <section className="admin-panel admin-panel-members"><div className="admin-panel-header"><div><span className="admin-panel-label">Equipe</span><h2>Quem tem acesso</h2></div><button className="admin-inline-button" onClick={onUsers}>Administrar usuários</button></div><div className="admin-member-preview">{latest.length ? latest.map((member) => <MemberRow key={member.user_id} member={member} compact />) : <EmptyState title="Nenhum usuário ainda" body="Crie o primeiro acesso na área de usuários." />}</div></section>
      <section className="admin-panel admin-panel-site"><div className="admin-panel-header"><div><span className="admin-panel-label">Site</span><h2>Estado da operação</h2></div><button className="admin-inline-button" onClick={onSite}>Abrir administração</button></div><div className="admin-site-signal"><span className={`admin-signal ${overview?.site.maintenanceMode ? 'is-warm' : 'is-good'}`} /><div><strong>{overview?.site.maintenanceMode ? 'Modo manutenção ativo' : 'Site em operação'}</strong><p>{overview?.site.available ? 'Configurações sincronizadas com o Neon.' : 'A migração de configurações ainda precisa ser aplicada.'}</p></div></div><div className="admin-site-details"><span>Google Analytics</span><strong>{overview?.site.analyticsPropertyId ? 'Propriedade conectada' : 'Ainda não configurado'}</strong></div><div className="admin-site-details"><span>Última configuração</span><strong>{overview?.site.updatedAt ? formatDate(overview.site.updatedAt) : 'Sem registro'}</strong></div></section>
    </div>
  </>;
}

function UsersPanel({ members, userForm, setUserForm, onCreate, editingMember, setEditingMember, onUpdate, onRemove, onReactivate }: { members: Member[]; userForm: { name: string; email: string; password: string }; setUserForm: (value: { name: string; email: string; password: string }) => void; onCreate: (event: FormEvent<HTMLFormElement>) => void; editingMember: Member | null; setEditingMember: (member: Member | null) => void; onUpdate: (event: FormEvent<HTMLFormElement>) => void; onRemove: (member: Member) => void; onReactivate: (member: Member) => void }) {
  const activeCount = members.filter((member) => member.is_active).length;
  return <div className="admin-users-layout"><section className="admin-panel admin-create-panel"><div className="admin-panel-header"><div><span className="admin-panel-label">Novo acesso geral</span><h2>Criar usuário</h2></div><span className="admin-count-label">{activeCount} ativos</span></div><p className="admin-panel-copy">Este acesso entra no Majurh sem organização. No primeiro acesso, a pessoa cria o próprio espaço e se torna administradora dele.</p><form className="admin-form" onSubmit={onCreate}><Field label="Nome completo" htmlFor="new-name"><input id="new-name" required minLength={2} value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} placeholder="Nome da pessoa" /></Field><Field label="E-mail de acesso" htmlFor="new-email"><input id="new-email" required type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} placeholder="pessoa@empresa.com" /></Field><Field label="Senha temporária (opcional)" htmlFor="new-password"><input id="new-password" minLength={8} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder="Gerar automaticamente" /></Field><button className="admin-primary-button" type="submit">Criar acesso geral</button></form></section><section className="admin-panel admin-directory-panel"><div className="admin-panel-header"><div><span className="admin-panel-label">Diretório global</span><h2>Pessoas com acesso ao Majurh</h2></div><span className="admin-count-label">Um e-mail por acesso</span></div><div className="admin-member-list">{members.length ? members.map((member) => <MemberRow key={member.user_id} member={member} onEdit={() => setEditingMember(member)} onRemove={() => void onRemove(member)} onReactivate={() => void onReactivate(member)} />) : <EmptyState title="Nenhum acesso ainda" body="O primeiro usuário aparecerá aqui depois que você criar um acesso geral." />}</div></section>{editingMember && <EditMemberDialog member={editingMember} onClose={() => setEditingMember(null)} onSubmit={onUpdate} />}</div>;
}

function AnalyticsPanel({ analytics, loading, onConfigure }: { analytics: Analytics | null; loading: boolean; onConfigure: () => void }) {
  if (loading) return <section className="admin-panel admin-empty-panel"><div className="admin-skeleton admin-skeleton-title" /><div className="admin-skeleton admin-skeleton-panel" /></section>;
  if (!analytics?.configured) return <section className="admin-panel admin-analytics-empty"><span className="admin-panel-label">Google Analytics 4</span><h2>Conecte métricas reais do site.</h2><p>{analytics?.reason || 'Configure a propriedade GA4 no painel de administração do site.'}</p><button className="admin-primary-button" onClick={onConfigure}>Configurar propriedade</button><div className="admin-note-block"><strong>Sem números inventados</strong><span>Enquanto a integração não estiver configurada, o console não exibe métricas simuladas.</span></div></section>;
  const totals = analytics.totals ?? { activeUsers: 0, sessions: 0, events: 0 };
  return <><div className="admin-analytics-toolbar"><div><span className="admin-panel-label">Últimos 7 dias</span><p>Propriedade {analytics.propertyId}</p></div>{analytics.openUrl && <a className="admin-secondary-button" href={analytics.openUrl} target="_blank" rel="noreferrer">Abrir Google Analytics</a>}</div><div className="admin-metric-grid admin-analytics-metrics"><Metric label="Usuários ativos" value={totals.activeUsers} caption="somatório do período" /><Metric label="Sessões" value={totals.sessions} caption="visitas registradas" /><Metric label="Eventos" value={totals.events} caption="interações recebidas" /></div><section className="admin-panel admin-analytics-table"><div className="admin-panel-header"><div><span className="admin-panel-label">Leitura diária</span><h2>Atividade do site</h2></div></div><div className="admin-data-table"><div className="admin-data-row admin-data-head"><span>Data</span><span>Usuários</span><span>Sessões</span><span>Eventos</span></div>{(analytics.daily ?? []).map((day) => <div className="admin-data-row" key={day.date}><span>{formatAnalyticsDate(day.date)}</span><strong>{day.activeUsers}</strong><strong>{day.sessions}</strong><strong>{day.events}</strong></div>)}</div></section></>;
}

function SitePanel({ site, setSite, onSave }: { site: SiteSettings; setSite: (value: SiteSettings) => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="admin-site-layout" onSubmit={onSave}><section className="admin-panel admin-site-form-panel"><div className="admin-panel-header"><div><span className="admin-panel-label">Configuração do site</span><h2>Administração do produto</h2></div><span className={`admin-availability ${site.available ? 'is-ready' : 'is-pending'}`}>{site.available ? 'Banco alinhado' : 'Migração pendente'}</span></div><p className="admin-panel-copy">Estas configurações ficam no Neon e podem ser consumidas pelo site principal em tempo real.</p><Field label="URL pública do produto" htmlFor="public-site-url"><input id="public-site-url" type="url" value={site.publicSiteUrl} onChange={(event) => setSite({ ...site, publicSiteUrl: event.target.value })} placeholder="app.suaempresa.com" /></Field><div className="admin-form-divider" /><div className="admin-form-section-title">Medição</div><Field label="ID da propriedade GA4" htmlFor="ga-property"><input id="ga-property" value={site.analyticsPropertyId} onChange={(event) => setSite({ ...site, analyticsPropertyId: event.target.value })} placeholder="123456789" /><small>Somente o número da propriedade, sem o prefixo properties/.</small></Field><Field label="ID de medição (opcional)" htmlFor="ga-measurement"><input id="ga-measurement" value={site.analyticsMeasurementId} onChange={(event) => setSite({ ...site, analyticsMeasurementId: event.target.value })} placeholder="G-XXXXXXXXXX" /></Field><div className="admin-form-divider" /><div className="admin-maintenance-row"><div><strong>Modo manutenção</strong><span>Mostra o estado de manutenção para o produto principal.</span></div><label className="admin-switch" htmlFor="maintenance-mode"><input id="maintenance-mode" type="checkbox" checked={site.maintenanceMode} onChange={(event) => setSite({ ...site, maintenanceMode: event.target.checked })} /><span aria-hidden="true" /></label></div><button className="admin-primary-button" type="submit">Salvar configurações</button></section><aside className="admin-panel admin-site-help-panel"><span className="admin-panel-label">Como funciona</span><h2>Uma configuração, dois projetos.</h2><p>O console administrativo grava no mesmo banco Neon que o Majurh usa. O app principal pode ler o estado público por uma rota server-side, sem expor credenciais.</p><div className="admin-help-list"><div><strong>01</strong><span>Aplicar a migração 0014 no Neon.</span></div><div><strong>02</strong><span>Preencher a propriedade GA4 e salvar.</span></div><div><strong>03</strong><span>Adicionar a conta de serviço como leitora no Google Analytics.</span></div></div><div className="admin-note-block"><strong>Credencial do Google</strong><span>O JSON da conta de serviço fica somente como segredo do projeto admin-portal. Nunca é persistido no banco.</span></div></aside></form>;
}

function MemberRow({ member, compact = false, onEdit, onRemove, onReactivate }: { member: Member; compact?: boolean; onEdit?: () => void; onRemove?: () => void; onReactivate?: () => void }) {
  return <div className={`admin-member-row ${compact ? 'is-compact' : ''}`}><div className="admin-member-initials" aria-hidden="true">{initials(member.full_name)}</div><div className="admin-member-identity"><strong>{member.full_name}</strong><span>{member.email}</span></div><span className={`admin-role-badge ${member.is_active ? 'role-active' : 'role-revoked'}`}>{member.is_active ? 'Acesso ativo' : 'Acesso revogado'}</span>{!compact && <div className="admin-member-actions"><button className="admin-row-button" onClick={onEdit}>Editar senha</button>{member.is_active ? <button className="admin-row-button is-danger" onClick={onRemove}>Revogar</button> : <button className="admin-row-button" onClick={onReactivate}>Reativar</button>}</div>}</div>;
}

function EditMemberDialog({ member, onClose, onSubmit }: { member: Member; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="admin-dialog-backdrop" role="presentation"><dialog open className="admin-dialog" aria-labelledby="edit-member-title"><div className="admin-dialog-header"><div><span className="admin-panel-label">Administrar acesso geral</span><h2 id="edit-member-title">{member.full_name}</h2></div><button className="admin-close-button" onClick={onClose} aria-label="Fechar">×</button></div><p>{member.email}</p><form className="admin-form" onSubmit={onSubmit}><Field label="Nova senha" htmlFor="edit-password"><input id="edit-password" name="password" minLength={8} placeholder="Informe uma nova senha" required /></Field><small>Esta senha é exclusiva do acesso ao Majurh. A organização será criada pela própria pessoa.</small><div className="admin-dialog-actions"><button className="admin-secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary-button" type="submit">Salvar senha</button></div></form></dialog></div>;
}

function CredentialsDialog({ credentials, onClose }: { credentials: { name: string; email: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard?.writeText(`Acesso Majurh\nE-mail: ${credentials.email}\nSenha temporária: ${credentials.password}`); setCopied(true); }
  return <div className="admin-dialog-backdrop" role="presentation"><dialog open className="admin-dialog admin-credentials-dialog" aria-labelledby="credentials-title"><span className="admin-panel-label">Acesso criado</span><h2 id="credentials-title">Envie as credenciais para {credentials.name}.</h2><p>A senha não será exibida novamente neste console.</p><div className="admin-credential-box"><span>E-mail</span><strong>{credentials.email}</strong><span>Senha temporária</span><strong>{credentials.password}</strong></div><div className="admin-dialog-actions"><button className="admin-secondary-button" onClick={() => void copy()}>{copied ? 'Copiado' : 'Copiar credenciais'}</button><button className="admin-primary-button" onClick={onClose}>Concluir</button></div></dialog></div>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) { return <div className="admin-field"><label htmlFor={htmlFor}>{label}</label>{children}</div>; }
function Metric({ label, value, caption, tone = 'normal' }: { label: string; value: number; caption: string; tone?: 'normal' | 'warm' | 'quiet' }) { return <div className={`admin-metric admin-metric-${tone}`}><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong><small>{caption}</small></div>; }
function EmptyState({ title, body }: { title: string; body: string }) { return <div className="admin-empty-state"><strong>{title}</strong><span>{body}</span></div>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function generatePassword() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#'; const values = new Uint32Array(14); crypto.getRandomValues(values); return Array.from(values, (value) => alphabet[value % alphabet.length]).join(''); }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)); }
function formatAnalyticsDate(value: string) { return value.length === 8 ? `${value.slice(6, 8)}/${value.slice(4, 6)}` : value; }
function tabLabel(tab: Tab) { return { overview: 'Visão geral', users: 'Usuários', analytics: 'Google Analytics', site: 'Administração do site' }[tab]; }
function headingFor(tab: Tab) { return { overview: 'Tudo sob controle.', users: 'Pessoas com acesso.', analytics: 'O site em números reais.', site: 'Configurações do produto.' }[tab]; }
function introFor(tab: Tab) { return { overview: 'Uma leitura rápida da organização e do que pede atenção.', users: 'Crie, edite e remova acessos sem abrir o ambiente operacional.', analytics: 'Dados da sua propriedade GA4, sem métricas simuladas.', site: 'Defina a conexão pública, medição e o estado do produto.' }[tab]; }
