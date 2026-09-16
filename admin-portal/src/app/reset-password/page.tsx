'use client';

import { authClient } from '@/lib/auth/client';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!token) return setError('Este link de redefinição não é válido ou já expirou.');
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    if (password !== confirmation) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError('Não foi possível redefinir a senha. Solicite um novo link.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Não foi possível redefinir a senha. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-reset-page">
      <section className="admin-reset-card" aria-labelledby="admin-reset-title">
        <div className="admin-brand-lockup">
          <span className="admin-brand-mark" aria-hidden="true">M</span>
          <span>Majurh <small>control plane</small></span>
        </div>
        {success ? <>
          <p className="admin-kicker">Senha atualizada</p>
          <h1 id="admin-reset-title">Acesso recuperado.</h1>
          <p className="admin-reset-copy">Sua nova senha já está ativa. Agora você pode entrar no console administrativo.</p>
          <a className="admin-primary-button" href="/login">Entrar no console</a>
        </> : <>
          <p className="admin-kicker">Recuperar acesso administrativo</p>
          <h1 id="admin-reset-title">Defina uma nova senha.</h1>
          <p className="admin-reset-copy">Escolha uma senha segura para voltar ao Majurh Admin.</p>
          <form className="admin-reset-form" onSubmit={submit}>
            <label htmlFor="reset-password">Nova senha</label>
            <input id="reset-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" />
            <label htmlFor="reset-password-confirm">Confirmar senha</label>
            <input id="reset-password-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repita a nova senha" />
            {error && <p className="admin-reset-error" role="alert">{error}</p>}
            <button className="admin-primary-button" type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Salvar nova senha'}</button>
          </form>
          <a className="admin-reset-back" href="/login">Voltar para o login</a>
        </>}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="admin-reset-page"><section className="admin-reset-card"><p>Carregando…</p></section></main>}><ResetPasswordForm /></Suspense>;
}
