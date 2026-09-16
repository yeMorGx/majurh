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
    <main className="auth-page auth-reset-page">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <div className="auth-brand"><span className="auth-brand-mark">M</span><strong>Majurh</strong></div>
        {success ? <>
          <p className="auth-eyebrow">Senha atualizada</p>
          <h1 id="reset-password-title">Acesso recuperado.</h1>
          <p className="auth-copy">Sua nova senha já está ativa. Você pode entrar no console administrativo.</p>
          <a className="button button-primary auth-submit" href="/login">Ir para o login</a>
        </> : <>
          <p className="auth-eyebrow">Recuperar acesso</p>
          <h1 id="reset-password-title">Defina uma nova senha.</h1>
          <p className="auth-copy">Escolha uma senha temporária segura para voltar ao Majurh.</p>
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="reset-password">Nova senha</label>
            <input id="reset-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" />
            <label htmlFor="reset-password-confirm">Confirmar senha</label>
            <input id="reset-password-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repita a nova senha" />
            {error && <p className="auth-form-error" role="alert">{error}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Salvar nova senha'}</button>
          </form>
        </>}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="auth-page auth-reset-page"><section className="auth-card"><p>Carregando…</p></section></main>}><ResetPasswordForm /></Suspense>;
}
