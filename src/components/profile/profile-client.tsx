'use client';

import { Icon } from '@/components/ui/icon';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useMemo, useState } from 'react';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type ProfileData = {
  user: { id: string; email: string | null };
  profile: Profile | null;
  membership: { role: string } | null;
  organization: { id: string; name: string; slug: string } | null;
};

export function ProfileClient() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch('/api/me', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar seu perfil.');
        if (!active) return;

        const profileData = payload.data as ProfileData;
        setData(profileData);
        setFullName(profileData.profile?.full_name ?? '');
        setEmail(profileData.user.email ?? '');
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const initials = useMemo(() => {
    const name = data?.profile?.full_name ?? fullName;
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'RH';
  }, [data?.profile?.full_name, fullName]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');

    const normalizedName = fullName.trim();
    if (normalizedName.length < 2 || normalizedName.length > 120) {
      setProfileError('O nome deve ter entre 2 e 120 caracteres.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: normalizedName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setProfileError(payload.error || 'Não foi possível salvar seu perfil.');
        return;
      }

      const profile = payload.data.profile as Profile;
      setData((current) => current ? { ...current, profile } : current);
      setFullName(profile.full_name);
      window.dispatchEvent(new CustomEvent<Profile>('profile:updated', { detail: profile }));
      setProfileMessage('Perfil atualizado.');
    } catch {
      setProfileError('Não foi possível salvar seu perfil. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveSecurity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityError('');
    setSecurityMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const currentEmail = data?.user.email?.trim().toLowerCase() ?? '';
    const emailChanged = normalizedEmail !== currentEmail;

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setSecurityError('Informe um e-mail válido.');
      return;
    }

    if (!emailChanged && !newPassword) {
      setSecurityError('Informe um novo e-mail ou uma nova senha para salvar.');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setSecurityError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (newPassword && newPassword !== passwordConfirmation) {
      setSecurityError('A confirmação da senha não confere.');
      return;
    }

    setSavingSecurity(true);
    try {
      const supabase = createClient();
      const messages: string[] = [];

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: normalizedEmail });
        if (error) throw error;
        messages.push('Enviamos um link de confirmação para o novo e-mail.');
      }

      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        messages.push('Senha atualizada.');
      }

      setNewPassword('');
      setPasswordConfirmation('');
      setSecurityMessage(messages.join(' '));
    } catch {
      setSecurityError('Não foi possível atualizar o acesso. Verifique os dados e tente novamente.');
    } finally {
      setSavingSecurity(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Conta interna</p>
          <h1>Meu perfil</h1>
          <p>Atualize como o RH identifica você e mantenha seus dados de acesso em dia.</p>
        </div>
      </div>

      {loadError && <div className="form-error" role="alert">{loadError}</div>}
      {loading ? <div className="loading-state">Carregando perfil</div> : data && (
        <>
          <section className="profile-card profile-hero profile-page-hero">
            <div className="profile-identity">
              <div className="profile-avatar">{initials}</div>
              <div>
                <p className="eyebrow">Perfil da equipe</p>
                <h2>{data.profile?.full_name || 'Perfil sem nome'}</h2>
                <div className="profile-meta">
                  <span>{data.user.email || 'E-mail não informado'}</span>
                  <span className="profile-role-tag">{roleLabel(data.membership?.role)}</span>
                </div>
              </div>
            </div>
            <div className="profile-hero-context">
              <span>Organização</span>
              <strong>{data.organization?.name || 'Sem organização'}</strong>
            </div>
          </section>

          <div className="profile-settings-grid">
            <section className="panel">
              <div className="panel-header">
                <div><h2>Dados do perfil</h2><p>Essas informações aparecem nas atividades do RH.</p></div>
                <Icon name="user" />
              </div>
              <form className="profile-form" onSubmit={saveProfile}>
                <div className="field">
                  <label htmlFor="profile-full-name">Nome completo</label>
                  <input
                    className="form-input"
                    id="profile-full-name"
                    name="fullName"
                    autoComplete="name"
                    minLength={2}
                    maxLength={120}
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Ex.: Gabriel Morgado"
                  />
                  <small>Use o nome pelo qual a equipe deve reconhecer você.</small>
                </div>
                {profileError && <div className="form-error" role="alert">{profileError}</div>}
                {profileMessage && <div className="form-success" role="status">{profileMessage}</div>}
                <div className="form-actions">
                  <button className="button button-primary" disabled={savingProfile}>
                    {savingProfile ? 'Salvando…' : 'Salvar perfil'}
                    <Icon name="check" size={16} />
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div><h2>Acesso e segurança</h2><p>Gerencie o e-mail e a senha do login.</p></div>
                <Icon name="settings" />
              </div>
              <form className="profile-form" onSubmit={saveSecurity}>
                <div className="field">
                  <label htmlFor="profile-email">E-mail de acesso</label>
                  <input
                    className="form-input"
                    id="profile-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <small>Alterar o e-mail pode exigir uma confirmação antes de concluir.</small>
                </div>
                <div className="field">
                  <label htmlFor="profile-new-password">Nova senha</label>
                  <input
                    className="form-input"
                    id="profile-new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Pelo menos 8 caracteres"
                  />
                </div>
                <div className="field">
                  <label htmlFor="profile-password-confirmation">Confirmar nova senha</label>
                  <input
                    className="form-input"
                    id="profile-password-confirmation"
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                  />
                </div>
                <p className="profile-security-copy">Deixe os campos de senha em branco se quiser alterar apenas o e-mail.</p>
                {securityError && <div className="form-error" role="alert">{securityError}</div>}
                {securityMessage && <div className="form-success" role="status">{securityMessage}</div>}
                <div className="form-actions">
                  <button className="button button-primary" disabled={savingSecurity}>
                    {savingSecurity ? 'Atualizando…' : 'Atualizar acesso'}
                    <Icon name="check" size={16} />
                  </button>
                </div>
              </form>
            </section>
          </div>

          <section className="panel profile-access-panel">
            <div className="panel-header">
              <div><h2>Contexto de acesso</h2><p>Informações administradas pela organização.</p></div>
              <Icon name="briefcase" />
            </div>
            <dl className="detail-list">
              <div><dt>Organização</dt><dd>{data.organization?.name ?? 'Não configurada'}</dd></div>
              <div><dt>Seu papel</dt><dd>{roleLabel(data.membership?.role)}</dd></div>
              <div><dt>Identificador</dt><dd className="mono">{data.user.id.slice(0, 8)}…</dd></div>
              <div><dt>Permissões</dt><dd>Definidas pela equipe administradora</dd></div>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function roleLabel(role: string | undefined) {
  return role === 'admin' ? 'Administrador' : role === 'recruiter' ? 'Recrutador' : role === 'viewer' ? 'Visualizador' : 'Sem papel';
}
