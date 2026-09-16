'use client';

import { Icon } from '@/components/ui/icon';
import type { OrganizationBrand } from '@/lib/branding';
import { useEffect, useState } from 'react';

type AdminData = {
  user: { email: string | null };
  profile: { full_name: string } | null;
  membership: { role: string } | null;
  organization: OrganizationBrand | null;
};

type Invitation = {
  id: string;
  email: string;
  role: 'manager' | 'recruiter' | 'viewer';
  expires_at: string;
  created_at: string;
};

type Member = {
  user_id: string;
  email: string | null;
  role: string;
  full_name: string;
  created_at: string;
};

export function AdminClient() {
  const [data, setData] = useState<AdminData | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'recruiter' | 'viewer'>('recruiter');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removingMember, setRemovingMember] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok) throw new Error(mePayload.error || 'Não foi possível carregar a administração.');
        if (!active) return;
        setData(mePayload.data as AdminData);

        const response = await fetch('/api/admin/invitations', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os acessos.');
        if (active) {
          setInvitations(payload.data?.invitations ?? []);
          setMembers(payload.data?.members ?? []);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a administração.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    setCreatedInvite(null);
    setCopied(false);
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Não foi possível criar o convite.');
        return;
      }
      setInvitations((current) => [payload.data.invitation, ...current]);
      setCreatedInvite({ email: payload.data.invitation.email, url: payload.data.inviteUrl });
      setEmail('');
      setMessage('Convite criado. Copie o link e envie para a pessoa convidada.');
    } catch {
      setError('Não foi possível criar o convite. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvitation(invitation: Invitation) {
    setRevoking(invitation.id);
    setError('');
    try {
      const response = await fetch(`/api/admin/invitations/${invitation.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Não foi possível revogar o convite.');
        return;
      }
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      if (createdInvite?.email === invitation.email) setCreatedInvite(null);
    } catch {
      setError('Não foi possível revogar o convite. Tente novamente.');
    } finally {
      setRevoking('');
    }
  }

  async function copyInvite() {
    if (!createdInvite) return;
    await navigator.clipboard.writeText(createdInvite.url);
    setCopied(true);
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Expulsar ${member.full_name} da organização?`)) return;
    setRemovingMember(member.user_id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(member.user_id)}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível expulsar esta pessoa.'); return; }
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
      setMessage(`${member.full_name} foi removido da organização.`);
    } catch {
      setError('Não foi possível expulsar esta pessoa. Tente novamente.');
    } finally {
      setRemovingMember('');
    }
  }

  if (loading) return <div className="loading-state">Carregando administração</div>;
  if (error && !data?.organization) return <div className="form-error" role="alert">{error}</div>;
  if (data?.membership?.role !== 'admin') {
    return <section className="panel access-restricted"><div className="access-pending-icon"><Icon name="settings" size={20} /></div><p className="eyebrow">Área restrita</p><h1>Somente administradores.</h1><p>O gerenciamento de acessos e convites fica disponível apenas para administradores da organização.</p></section>;
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{data.organization?.name || 'Organização'} · Controle de acesso</p>
          <h1>Administração</h1>
          <p>Crie convites e acompanhe quem pode entrar no espaço da sua organização.</p>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="form-success" role="status">{message}</div>}

      <div className="admin-grid">
        <section className="panel admin-invite-panel">
          <div className="panel-header"><div><h2>Novo acesso</h2><p>O link vale por 7 dias e só pode ser usado uma vez.</p></div><Icon name="plus" /></div>
          <form className="admin-invite-form" onSubmit={createInvitation}>
            <div className="field"><label htmlFor="invite-email">E-mail da pessoa</label><input className="form-input" id="invite-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pessoa@empresa.com" /></div>
            <div className="field"><label htmlFor="invite-role">Papel no Majurh</label><select className="form-select" id="invite-role" value={role} onChange={(event) => setRole(event.target.value as 'manager' | 'recruiter' | 'viewer')}><option value="manager">Gerente — acompanha a operação</option><option value="recruiter">Recrutador — pode operar o RH</option><option value="viewer">Visualizador — somente consulta</option></select></div>
            <button className="button button-primary" disabled={saving}>{saving ? 'Criando convite…' : 'Criar convite'}<Icon name="arrow-up-right" size={16} /></button>
          </form>
          {createdInvite && <div className="invite-created"><strong>Link pronto para enviar</strong><span>{createdInvite.email}</span><div className="invite-url"><code>{createdInvite.url}</code><button type="button" className="button button-secondary" onClick={copyInvite}>{copied ? 'Copiado' : 'Copiar link'}</button></div><small>O link abre uma tela segura para a pessoa criar a senha e concluir o acesso.</small></div>}
        </section>

        <section className="panel admin-policy-panel">
          <div className="panel-header"><div><h2>Política de acesso</h2><p>Como o espaço está protegido.</p></div><Icon name="check-circle" /></div>
          <div className="policy-list"><div><span className="policy-dot" />Cadastro público desativado</div><div><span className="policy-dot" />Convite obrigatório para novos usuários</div><div><span className="policy-dot" />Administradores criam e revogam links</div><div><span className="policy-dot" />Administrador é o único papel elevado</div></div>
        </section>
      </div>

      <section className="panel admin-members-panel">
        <div className="panel-header"><div><h2>Pessoas na organização</h2><p>{members.length} {members.length === 1 ? 'pessoa com acesso' : 'pessoas com acesso'} ao espaço.</p></div><Icon name="users" /></div>
        {members.length === 0 ? <div className="empty-state"><strong>Nenhuma pessoa cadastrada</strong><p>Crie o primeiro convite para começar a equipe.</p></div> : <div className="member-list">{members.map((member) => <div className="member-row" key={member.user_id}><div className="avatar avatar-small">{initials(member.full_name)}</div><div className="member-copy"><strong>{member.full_name}</strong><span>{member.email || 'E-mail não disponível'}</span></div><span className={`role-pill role-${member.role}`}>{roleLabel(member.role)}</span><button type="button" className="button button-ghost member-remove-button" onClick={() => removeMember(member)} disabled={removingMember === member.user_id}>{removingMember === member.user_id ? 'Removendo…' : 'Expulsar'}</button></div>)}</div>}
      </section>

      <section className="panel admin-members-panel">
        <div className="panel-header"><div><h2>Convites pendentes</h2><p>Links ainda não utilizados.</p></div><Icon name="clock" /></div>
        {invitations.length === 0 ? <div className="empty-state"><strong>Nenhum convite pendente</strong><p>Os novos links que você criar aparecerão aqui.</p></div> : <div className="invite-list">{invitations.map((invitation) => <div className="invite-row" key={invitation.id}><div className="invite-copy"><strong>{invitation.email}</strong><span>{roleLabel(invitation.role)} · expira em {formatDate(invitation.expires_at)}</span></div><button type="button" className="button button-ghost" onClick={() => revokeInvitation(invitation)} disabled={revoking === invitation.id}>{revoking === invitation.id ? 'Revogando…' : 'Revogar'}</button></div>)}</div>}
      </section>
    </div>
  );
}

function roleLabel(role: string) {
  return role === 'admin' ? 'Administrador' : role === 'manager' ? 'Gerente' : role === 'recruiter' ? 'Recrutador' : 'Visualizador';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RH';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}
