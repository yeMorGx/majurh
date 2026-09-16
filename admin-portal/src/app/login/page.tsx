'use client';

import { authClient } from '@/lib/auth/client';
import { FormEvent, useState } from 'react';

function authErrorMessage(error: unknown) {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof details.message === 'string' ? details.message.toLowerCase() : '';
  if (message.includes('invalid') || message.includes('credential')) return 'E-mail ou senha inválidos.';
  if (message.includes('environment') || message.includes('variável')) return 'O Neon Auth ainda não está configurado neste ambiente.';
  return 'Não foi possível entrar no console. Tente novamente.';
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(authErrorMessage(result.error));
        return;
      }
      window.location.assign('/');
    } catch (loginError) {
      setError(authErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  async function requestReset() {
    setError('');
    setResetSent(false);
    if (!email.trim()) {
      setError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), redirectTo: 'https://majurh-admin.vercel.app/reset-password' }),
      });
      if (!response.ok) throw new Error('reset');
      setResetSent(true);
    } catch {
      setError('Não foi possível solicitar a redefinição agora. Tente novamente.');
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
          {resetSent && <p className="admin-form-success" role="status">Se o e-mail estiver cadastrado, o link de redefinição foi enviado.</p>}
          <button className="admin-primary-button" type="submit" disabled={loading}>
            {loading ? 'Verificando acesso...' : 'Entrar no console'}
          </button>
          <button className="admin-text-button admin-reset-button" type="button" onClick={() => void requestReset()} disabled={loading}>Esqueci minha senha</button>
        </form>
        <p className="admin-login-footnote">O cadastro público está desativado. Novos acessos são criados por um administrador.</p>
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
