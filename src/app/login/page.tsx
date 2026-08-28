'use client';

import { Icon } from '@/components/ui/icon';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('Não foi possível entrar. Confira seu e-mail e senha.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message.includes('Variável de ambiente') ? 'O Supabase ainda não está configurado neste ambiente.' : 'Não foi possível entrar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-brand"><div className="brand-mark brand-mark-logo"><img src="/logo.svg" alt="" /></div><strong>Vieira Couto RH</strong></div>
          <p className="eyebrow">Acesso interno</p>
          <h1>Entrar no seu posto de controle.</h1>
          <p>Organize candidatos, processos e documentos em um só lugar.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field"><label htmlFor="email">E-mail</label><input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" /></div>
            <div className="field"><label htmlFor="password">Senha</label><input className="form-input" id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" /></div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}<Icon name="arrow-up-right" size={16} /></button>
          </form>
        </div>
      </section>
      <aside className="login-side-art"><div className="art-content"><span className="art-kicker">Vieira Couto · RH</span><h2>O histórico certo para a próxima decisão.</h2><p>Uma visão calma do fluxo de pessoas, do primeiro contato à admissão.</p><div className="art-trail"><div className="art-step"><span className="art-step-dot" />Candidato identificado</div><div className="art-step"><span className="art-step-dot" />Processo em andamento</div><div className="art-step"><span className="art-step-dot" />Próximo passo claro</div></div></div></aside>
    </main>
  );
}
