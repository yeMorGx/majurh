'use client';

import { Icon } from '@/components/ui/icon';
import { useState } from 'react';

type Organization = {
  id: string;
  name: string;
  slug: string;
};

export function OrganizationOnboarding({
  email,
  onCompleted,
}: {
  email: string | null;
  onCompleted: (data: { organization: Organization; membership: { role: string } }) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'Não foi possível configurar sua organização.');
        return;
      }

      onCompleted(payload.data);
    } catch {
      setError('Não foi possível configurar sua organização. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-wrap">
      <section className="onboarding-card">
        <div className="onboarding-intro">
          <div className="onboarding-mark"><Icon name="briefcase" size={19} /></div>
          <p className="eyebrow">Próximo passo</p>
          <h1>Crie o espaço do seu RH.</h1>
          <p>Seu login e perfil estão prontos. Agora falta definir a organização que vai reunir candidatos, processos e documentos.</p>
          <div className="onboarding-email"><span>E-mail conectado</span><strong>{email || 'E-mail da sessão'}</strong></div>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="organization-name">Nome da organização</label>
            <input
              className="form-input"
              id="organization-name"
              name="name"
              autoComplete="organization"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Vieira Couto RH"
            />
            <small>Você será o administrador deste espaço e poderá adicionar sua equipe depois.</small>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={loading}>
            {loading ? 'Criando organização…' : 'Criar organização'}
            <Icon name="arrow-up-right" size={16} />
          </button>
          <p className="onboarding-note">Se sua equipe já possui uma organização, peça ao administrador para adicionar este e-mail como membro.</p>
        </form>
      </section>
    </div>
  );
}
