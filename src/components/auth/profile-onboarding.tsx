'use client';

import { Icon } from '@/components/ui/icon';
import { useState } from 'react';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

export function ProfileOnboarding({
  email,
  onCompleted,
}: {
  email: string | null;
  onCompleted: (profile: Profile) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'Não foi possível criar seu perfil.');
        return;
      }

      onCompleted(payload.data.profile);
    } catch {
      setError('Não foi possível criar seu perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-wrap">
      <section className="onboarding-card">
        <div className="onboarding-intro">
          <div className="onboarding-mark"><Icon name="user" size={19} /></div>
          <p className="eyebrow">Primeiro acesso</p>
          <h1>Complete seu perfil para entrar.</h1>
          <p>Seu login foi confirmado. Falta apenas registrar como o RH deve identificar você no sistema.</p>
          <div className="onboarding-email"><span>E-mail conectado</span><strong>{email || 'E-mail da sessão'}</strong></div>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="onboarding-full-name">Nome completo</label>
            <input
              className="form-input"
              id="onboarding-full-name"
              name="fullName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ex.: Gabriel Morgado"
            />
            <small>Esse nome aparecerá no seu perfil e nas atividades do RH.</small>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={loading}>
            {loading ? 'Criando perfil…' : 'Criar meu perfil'}
            <Icon name="arrow-up-right" size={16} />
          </button>
        </form>
      </section>
    </div>
  );
}
