'use client';

import { Icon } from '@/components/ui/icon';
import { useEffect, useMemo, useState } from 'react';

type AppRole = 'recruiter' | 'viewer';

type Member = {
  user_id: string;
  email: string | null;
  role: 'admin' | AppRole;
  full_name: string;
  created_at: string;
};

type CreatedAccess = {
  name: string;
  email: string;
  password: string;
  role: AppRole;
};

type AdminData = {
  organization: { name: string; slug: string };
  members: Member[];
};

export function AdminConsoleClient() {
  const [data, setData] = useState<AdminData | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('recruiter');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createdAccess, setCreatedAccess] = useState<CreatedAccess | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadUsers() {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os acessos.');
    setData(payload.data as AdminData);
  }

  useEffect(() => {
    let active = true;
    loadUsers()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a administração.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const admins = useMemo(() => data?.members.filter((member) => member.role === 'admin').length ?? 0, [data]);
  const teamMembers = useMemo(() => data?.members.filter((member) => member.role !== 'admin').length ?? 0, [data]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    setCreatedAccess(null);
    setCopied(false);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Não foi possível criar o acesso.');
        return;
      }

      setCreatedAccess({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      setMessage('Acesso criado e vinculado à organização.');
      setName('');
      setEmail('');
      setPassword('');
      await loadUsers();
    } catch {
      setError('Não foi possível criar o acesso. Confira a conexão com o Neon e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(14);
    crypto.getRandomValues(values);
    setPassword(Array.from(values, (value) => alphabet[value % alphabet.length]).join(''));
  }

  async function copyCredentials() {
    if (!createdAccess) return;
    await navigator.clipboard.writeText(`E-mail: ${createdAccess.email}\nSenha temporária: ${createdAccess.password}`);
    setCopied(true);
  }

  if (loading) {
    return <main className="admin-console-page"><div className="admin-console-loading" role="status">Carregando centro administrativo…</div></main>;
  }

  if (error && !data) {
    return <main className="admin-console-page"><section className="admin-console-error" role="alert"><Icon name="settings" size={22} /><div><p className="eyebrow">Centro administrativo</p><h1>Não foi possível abrir esta área.</h1><p>{error}</p></div></section></main>;
  }

  return (
    <main className="admin-console-page">
      <div className="admin-console-shell">
        <header className="admin-console-header">
          <a className="admin-console-brand" href="/dashboard" aria-label="Voltar ao Majurh">
            <span className="admin-console-mark"><img src="/brand/majurh-dog-mark.svg" alt="" /></span>
            <span><strong>Majurh</strong><small>Centro administrativo</small></span>
          </a>
          <div className="admin-console-header-meta"><span className="admin-console-status"><i /> Ambiente protegido</span><a href="/dashboard">Voltar ao app <Icon name="arrow-up-right" size={15} /></a></div>
        </header>

        <section className="admin-console-hero">
          <div className="admin-console-hero-copy">
            <p className="admin-console-kicker"><Icon name="settings" size={15} /> Controle da organização</p>
            <h1>Crie acessos com clareza.</h1>
            <p>Cadastre a equipe que poderá entrar no espaço de <strong>{data?.organization.name || 'sua organização'}</strong>. Cada pessoa recebe uma conta própria no Neon Auth, com papel definido no Majurh.</p>
          </div>
          <div className="admin-console-orbit admin-console-orbit-one" aria-hidden="true" />
          <div className="admin-console-orbit admin-console-orbit-two" aria-hidden="true" />
          <div className="admin-console-hero-stats">
            <div><span>Acessos ativos</span><strong>{data?.members.length ?? 0}</strong></div>
            <div><span>Equipe operacional</span><strong>{teamMembers}</strong></div>
            <div><span>Administradores</span><strong>{admins}</strong></div>
          </div>
        </section>

        {error && <div className="admin-console-alert admin-console-alert-error" role="alert"><Icon name="x" size={16} />{error}</div>}
        {message && <div className="admin-console-alert admin-console-alert-success" role="status"><Icon name="check-circle" size={16} />{message}</div>}

        <div className="admin-console-grid">
          <section className="admin-console-card admin-console-form-card">
            <div className="admin-console-card-heading"><span className="admin-console-icon"><Icon name="user" /></span><div><p className="eyebrow">Novo acesso</p><h2>Adicionar pessoa</h2><p>Crie a conta e entregue uma senha temporária.</p></div></div>
            <form className="admin-console-form" onSubmit={createUser}>
              <div className="admin-console-field"><label htmlFor="admin-user-name">Nome completo</label><input id="admin-user-name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Maria Julia" autoComplete="name" required minLength={2} maxLength={120} /></div>
              <div className="admin-console-field"><label htmlFor="admin-user-email">E-mail de acesso</label><input id="admin-user-email" className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pessoa@empresa.com.br" autoComplete="email" required /></div>
              <div className="admin-console-field"><div className="admin-console-label-row"><label htmlFor="admin-user-password">Senha temporária</label><button type="button" className="admin-console-generate" onClick={generatePassword}>Gerar senha</button></div><div className="admin-console-password-field"><input id="admin-user-password" className="form-input" type="text" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} maxLength={128} autoComplete="new-password" required /><Icon name="key" size={16} /></div><small>A pessoa poderá trocar a senha depois de entrar.</small></div>
              <div className="admin-console-field"><label htmlFor="admin-user-role">Papel no Majurh</label><select id="admin-user-role" className="form-select" value={role} onChange={(event) => setRole(event.target.value as AppRole)}><option value="recruiter">Recrutador — opera o RH</option><option value="viewer">Visualizador — somente consulta</option></select></div>
              <button className="button button-primary admin-console-submit" disabled={saving}>{saving ? 'Criando acesso…' : 'Criar acesso'}<Icon name="arrow-up-right" size={16} /></button>
            </form>
          </section>

          <aside className="admin-console-card admin-console-guide-card">
            <div className="admin-console-card-heading"><span className="admin-console-icon admin-console-icon-dark"><Icon name="check-circle" /></span><div><p className="eyebrow">Fluxo seguro</p><h2>Como funciona</h2></div></div>
            <div className="admin-console-steps"><div><b>01</b><span><strong>Você cria o acesso</strong><small>O Neon Auth registra a conta com a senha definida.</small></span></div><div><b>02</b><span><strong>O Majurh vincula a equipe</strong><small>O perfil e o papel são gravados no espaço da organização.</small></span></div><div><b>03</b><span><strong>A pessoa entra pelo login</strong><small>Não existe cadastro público nesta versão.</small></span></div></div>
            <div className="admin-console-note"><Icon name="clock" size={16} /><span>A senha temporária é exibida apenas nesta tela. Copie e envie por um canal seguro.</span></div>
          </aside>
        </div>

        {createdAccess && <section className="admin-console-credential" role="status"><div className="admin-console-credential-main"><span className="admin-console-credential-icon"><Icon name="check" size={18} /></span><div><p className="eyebrow">Acesso pronto</p><h2>{createdAccess.name} já pode entrar</h2><p>{createdAccess.email} · {roleLabel(createdAccess.role)}</p></div></div><div className="admin-console-credential-password"><span>Senha temporária</span><code>{createdAccess.password}</code></div><button type="button" className="button button-secondary" onClick={copyCredentials}>{copied ? 'Credenciais copiadas' : 'Copiar credenciais'}<Icon name="file-text" size={15} /></button></section>}

        <section className="admin-console-card admin-console-members-card"><div className="admin-console-card-heading"><span className="admin-console-icon"><Icon name="users" /></span><div><p className="eyebrow">Equipe da organização</p><h2>Pessoas com acesso</h2><p>Contas vinculadas a {data?.organization.name || 'esta organização'}.</p></div><span className="admin-console-count">{data?.members.length ?? 0} acessos</span></div>{data?.members.length ? <div className="admin-console-member-list">{data.members.map((member) => <div className="admin-console-member" key={member.user_id}><span className="admin-console-avatar">{initials(member.full_name)}</span><span className="admin-console-member-copy"><strong>{member.full_name}</strong><small>{member.email || 'E-mail não disponível'}</small></span><span className={`admin-console-role admin-console-role-${member.role}`}>{roleLabel(member.role)}</span></div>)}</div> : <div className="admin-console-empty"><Icon name="users" size={20} /><strong>Nenhum acesso encontrado</strong><p>Crie o primeiro usuário acima para começar.</p></div>}</section>

        <footer className="admin-console-footer"><span>Majurh · administração isolada</span><span>Neon Auth + Neon Postgres</span></footer>
      </div>
    </main>
  );
}

function roleLabel(role: string) {
  return role === 'admin' ? 'Administrador' : role === 'recruiter' ? 'Recrutador' : 'Visualizador';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RH';
}
