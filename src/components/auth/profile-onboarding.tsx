'use client';

import { Icon } from '@/components/ui/icon';
import { authClient } from '@/lib/auth/client';
import { useMemo, useState } from 'react';

type Profile = { id: string; full_name: string; avatar_url: string | null };
type SiteAccess = { mustChangePassword: boolean; onboardingCompleted: boolean } | null;
type Step = 'password' | 'personal' | 'discovery';

const leadSources = [
  ['linkedin', 'LinkedIn'],
  ['referral', 'Indicação'],
  ['google', 'Busca no Google'],
  ['instagram', 'Instagram / anúncio'],
  ['event', 'Evento ou feira de RH'],
  ['other', 'Outro'],
] as const;

const goals = [
  ['organize_hr', 'Organizar o RH'],
  ['documents_payroll', 'Acessar documentos e holerites'],
  ['explore', 'Testar e explorar o Majurh'],
] as const;

export function ProfileOnboarding({
  email,
  siteAccess,
  onCompleted,
}: {
  email: string | null;
  siteAccess: SiteAccess;
  onCompleted: (data: { profile: Profile; siteAccess: { mustChangePassword: boolean; onboardingCompleted: boolean } }) => void;
}) {
  const [step, setStep] = useState<Step>(siteAccess?.mustChangePassword ? 'password' : 'personal');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [leadSource, setLeadSource] = useState('');
  const [referralName, setReferralName] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(!siteAccess?.mustChangePassword);

  const stepNumber = step === 'password' ? 1 : step === 'personal' ? 2 : 3;
  const stepLabel = step === 'password' ? 'Proteja seu acesso' : step === 'personal' ? 'Sobre você' : 'Como podemos ajudar?';
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/\d/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    if (newPassword.length >= 12) score += 1;
    return score;
  }, [newPassword]);

  function fail(message: string) {
    setError(message);
    setLoading(false);
  }

  async function continueFromPassword() {
    setError('');
    if (!currentPassword) return fail('Informe a senha temporária recebida.');
    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      return fail('A nova senha precisa ter 8 caracteres, um número e um caractere especial.');
    }
    if (newPassword !== passwordConfirmation) return fail('A confirmação da senha não confere.');
    setLoading(true);
    try {
      const { error: changeError } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
      if (changeError) throw changeError;
      setPasswordChanged(true);
      setStep('personal');
    } catch {
      fail('Não foi possível trocar a senha temporária. Confira os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function continueFromPersonal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (preferredName.trim().length < 2) return fail('Informe como você prefere ser chamado.');
    setStep('discovery');
  }

  async function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!passwordChanged) return fail('Troque sua senha temporária antes de continuar.');
    if (!leadSource) return fail('Selecione como você conheceu o Majurh.');
    if (leadSource === 'referral' && referralName.trim().length < 2) return fail('Informe quem fez a indicação.');
    if (!primaryGoal) return fail('Selecione seu principal objetivo.');
    setLoading(true);
    try {
      let avatarPath: string | null = null;
      if (avatar) {
        const formData = new FormData();
        formData.set('file', avatar);
        const avatarResponse = await fetch('/api/onboarding/avatar', { method: 'POST', body: formData });
        const avatarPayload = await avatarResponse.json();
        if (!avatarResponse.ok) throw new Error(avatarPayload.error || 'Não foi possível enviar a foto.');
        avatarPath = avatarPayload.data.path;
      }

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredName: preferredName.trim(),
          birthDate: birthDate || null,
          phone: phone.trim() || null,
          avatarPath,
          leadSource,
          referralName: leadSource === 'referral' ? referralName.trim() : null,
          primaryGoal,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir seu onboarding.');
      onCompleted(payload.data);
    } catch (finishError) {
      fail(finishError instanceof Error ? finishError.message : 'Não foi possível concluir seu onboarding.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-wrap onboarding-flow-wrap">
      <section className="onboarding-card onboarding-flow-card">
        <div className="onboarding-intro">
          <div className="onboarding-mark"><Icon name="user" size={19} /></div>
          <p className="eyebrow">Primeiro acesso · passo {stepNumber} de 3</p>
          <h1>{stepLabel}.</h1>
          <p>{step === 'password' ? 'Sua conta foi criada por um administrador. Troque a senha temporária para começar com segurança.' : step === 'personal' ? 'Essas informações deixam seu espaço mais pessoal e ajudam o RH a identificar você.' : 'Uma resposta rápida ajuda o Majurh a preparar uma experiência mais útil para você.'}</p>
          <div className="onboarding-progress" aria-label={`Passo ${stepNumber} de 3`}><span className={stepNumber >= 1 ? 'is-done' : ''} /><span className={stepNumber >= 2 ? 'is-done' : ''} /><span className={stepNumber >= 3 ? 'is-done' : ''} /></div>
          <div className="onboarding-email"><span>E-mail conectado</span><strong>{email || 'E-mail da sessão'}</strong></div>
        </div>

        {step === 'password' && <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); void continueFromPassword(); }}>
          <div className="field"><label htmlFor="temporary-password">Senha temporária</label><input className="form-input" id="temporary-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Digite a senha recebida" /></div>
          <div className="field"><label htmlFor="new-onboarding-password">Nova senha</label><input className="form-input" id="new-onboarding-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Crie uma senha pessoal" /><small className="password-rules">{passwordStrength}/4 requisitos atendidos · mínimo de 8 caracteres, número e símbolo.</small></div>
          <div className="field"><label htmlFor="confirm-onboarding-password">Confirme a nova senha</label><input className="form-input" id="confirm-onboarding-password" type="password" autoComplete="new-password" required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Digite novamente" /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={loading}>{loading ? 'Atualizando senha…' : 'Continuar'}<Icon name="arrow-up-right" size={16} /></button>
        </form>}

        {step === 'personal' && <form className="onboarding-form" onSubmit={continueFromPersonal}>
          <div className="field"><label htmlFor="onboarding-preferred-name">Como você prefere ser chamado?</label><input className="form-input" id="onboarding-preferred-name" autoComplete="name" required minLength={2} maxLength={120} value={preferredName} onChange={(event) => setPreferredName(event.target.value)} placeholder="Ex.: Gabriel Morgado" /><small>Esse nome aparecerá no seu perfil e nas atividades do RH.</small></div>
          <div className="onboarding-field-grid"><div className="field"><label htmlFor="onboarding-birth-date">Data de nascimento <span>(opcional)</span></label><input className="form-input" id="onboarding-birth-date" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></div><div className="field"><label htmlFor="onboarding-phone">Telefone / WhatsApp <span>(opcional)</span></label><input className="form-input" id="onboarding-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" /></div></div>
          <div className="field"><label htmlFor="onboarding-avatar">Foto de perfil <span>(opcional)</span></label><input className="form-input onboarding-file-input" id="onboarding-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /><small>{avatar ? avatar.name : 'Você pode pular por enquanto. Envie um arquivo PNG, JPG ou WEBP.'}</small></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={loading}>Continuar<Icon name="arrow-up-right" size={16} /></button>
        </form>}

        {step === 'discovery' && <form className="onboarding-form" onSubmit={finish}>
          <div className="field"><label>Como você conheceu o Majurh?</label><div className="onboarding-choice-grid">{leadSources.map(([value, label]) => <button type="button" key={value} className={`onboarding-choice ${leadSource === value ? 'is-selected' : ''}`} onClick={() => setLeadSource(value)}>{label}</button>)}</div></div>
          {leadSource === 'referral' && <div className="field"><label htmlFor="onboarding-referral">Quem fez a indicação?</label><input className="form-input" id="onboarding-referral" required value={referralName} onChange={(event) => setReferralName(event.target.value)} placeholder="Nome da pessoa ou empresa" /></div>}
          <div className="field"><label>Qual é seu principal objetivo?</label><div className="onboarding-choice-stack">{goals.map(([value, label]) => <button type="button" key={value} className={`onboarding-choice ${primaryGoal === value ? 'is-selected' : ''}`} onClick={() => setPrimaryGoal(value)}>{label}</button>)}</div></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={loading}>{loading ? 'Salvando seu acesso…' : 'Concluir meu perfil'}<Icon name="arrow-up-right" size={16} /></button>
        </form>}
      </section>
    </div>
  );
}
