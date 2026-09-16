'use client';

import { FormEvent, useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(result.error || 'Não foi possível entrar no console. Tente novamente.'); return; }
      window.location.assign('/');
    } catch {
      setError('Não foi possível conectar ao console. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-panel" aria-labelledby="login-title">
        <div className="admin-brand-lockup">
          <span className="admin-brand-mark" aria-hidden="true">M</span>
          <span>Majurh <small>control plane</small></span>
        </div>
        <p className="admin-kicker">Acesso restrito</p>
        <h1 id="login-title">Administre o produto com clareza.</h1>
        <p className="admin-login-copy">Usuários, saúde do site e configurações da organização em um espaço separado.</p>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail administrativo</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <button className="admin-primary-button" type="submit" disabled={loading}>
            {loading ? 'Verificando acesso...' : 'Entrar no console'}
          </button>
        </form>
        <p className="admin-login-footnote">O acesso é criado e gerenciado por um administrador. As credenciais deste console são independentes do Majurh operacional.</p>
      </section>
      <aside className="admin-login-aside" aria-label="Sobre o console">
        <span className="admin-aside-index">MAJURH / ADMIN</span>
        <div>
          <p className="admin-kicker">Um espaço para governar</p>
          <h2>Menos ruído. Mais controle sobre o que importa.</h2>
          <p>O console é um projeto separado do ambiente de operação. Ele usa o mesmo Neon, com rotas server-side protegidas.</p>
        </div>
        <div className="admin-aside-rule" />
        <p className="admin-aside-meta">Acesso somente para administradores da organização.</p>
      </aside>
    </main>
  );
}
