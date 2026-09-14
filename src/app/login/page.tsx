'use client';

import { Icon } from '@/components/ui/icon';
import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function authErrorMessage(mode: 'login' | 'signup', error: unknown) {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : '';
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof details.message === 'string'
      ? details.message.toLowerCase()
      : '';

  if (code.includes('already') || message.includes('already registered') || message.includes('already exists')) {
    return 'Este e-mail já possui uma conta. Troque para “Já tenho uma conta? Entrar”.';
  }

  if (code.includes('invalid_email') || message.includes('invalid email')) {
    return 'Informe um e-mail válido.';
  }

  const weakPassword = code.includes('password') && (code.includes('short') || code.includes('weak'))
    || message.includes('password') && (message.includes('short') || message.includes('weak') || message.includes('security'));
  if (weakPassword) {
    return 'A senha precisa ter pelo menos 8 caracteres e atender aos requisitos de segurança.';
  }

  if (code.includes('email_not_confirmed') || message.includes('verification required') || message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique também a caixa de spam.';
  }

  return mode === 'login'
    ? 'Não foi possível entrar. Confira seu e-mail e senha.'
    : 'Não foi possível criar o acesso agora. Tente novamente em instantes.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configurationMissing, setConfigurationMissing] = useState(false);

  useEffect(() => {
    setConfigurationMissing(
      new URLSearchParams(window.location.search).get('configuration') === 'missing',
    );
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: fullName });
      if (result.error) {
        setError(authErrorMessage(mode, result.error));
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message.includes('Variável de ambiente') ? 'O Neon Auth ainda não está configurado neste ambiente.' : authErrorMessage(mode, loginError));
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
          {configurationMissing && (
            <div className="form-error" role="alert">
              O ambiente de produção ainda não está conectado ao Neon Auth. Configure as variáveis do Neon na Vercel e publique novamente.
            </div>
          )}
          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'signup' && <div className="field"><label htmlFor="full-name">Nome completo</label><input className="form-input" id="full-name" type="text" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Seu nome completo" /></div>}
            <div className="field"><label htmlFor="email">E-mail</label><input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" /></div>
            <div className="field"><label htmlFor="password">Senha</label><input className="form-input" id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'Crie uma senha com 8 caracteres' : 'Digite sua senha'} /></div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary" disabled={loading}>{loading ? (mode === 'login' ? 'Entrando…' : 'Criando acesso…') : (mode === 'login' ? 'Entrar' : 'Criar acesso')}<Icon name="arrow-up-right" size={16} /></button>
          </form>
          <button type="button" className="login-mode-toggle" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'Primeiro acesso? Criar uma conta' : 'Já tenho uma conta? Entrar'}</button>
        </div>
      </section>
      <aside className="login-side-art"><div className="art-content"><span className="art-kicker">Vieira Couto · RH</span><h2>O histórico certo para a próxima decisão.</h2><p>Uma visão calma do fluxo de pessoas, do primeiro contato à admissão.</p><div className="art-trail"><div className="art-step"><span className="art-step-dot" />Candidato identificado</div><div className="art-step"><span className="art-step-dot" />Processo em andamento</div><div className="art-step"><span className="art-step-dot" />Próximo passo claro</div></div></div></aside>
    </main>
  );
}
