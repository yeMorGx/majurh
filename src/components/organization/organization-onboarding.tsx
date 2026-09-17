'use client';

import { Icon } from '@/components/ui/icon';
import { useState } from 'react';

type Organization = { id: string; name: string; slug: string; brand_logo_path?: string | null };
type OrganizationResult = { organization: Organization; membership: { role: string } };

const employeeRanges = [['1_10', '1–10 pessoas'], ['11_50', '11–50 pessoas'], ['51_200', '51–200 pessoas'], ['200_plus', '200+ pessoas']] as const;
const industries = [['technology', 'Tecnologia'], ['services', 'Serviços'], ['retail', 'Varejo'], ['industry', 'Indústria'], ['health', 'Saúde'], ['other', 'Outro']] as const;
const modules = [['attendance', 'Ponto e frequência'], ['documents', 'Admissão e documentos'], ['payroll', 'Folha'], ['evaluation', 'Avaliação']] as const;

export function OrganizationOnboarding({
  email,
  onCompleted,
}: {
  email: string | null;
  onCompleted: (data: OrganizationResult) => void;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [employeeRange, setEmployeeRange] = useState('');
  const [industry, setIndustry] = useState('');
  const [hasDedicatedHr, setHasDedicatedHr] = useState<boolean | null>(null);
  const [initialModules, setInitialModules] = useState<string[]>([]);
  const [implementationPreference, setImplementationPreference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleModule(value: string) {
    setInitialModules((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function nextStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (step === 1 && name.trim().length < 2) return setError('Informe o nome da organização.');
    if (step === 2 && (!employeeRange || !industry || hasDedicatedHr === null)) return setError('Responda os dados básicos da empresa.');
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit() {
    setError('');
    if (!implementationPreference) return setError('Escolha como prefere começar.');
    setLoading(true);
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), cnpj: cnpj.trim() || null, legalName: legalName.trim() || null, tradeName: tradeName.trim() || null, employeeRange, industry, hasDedicatedHr, initialModules, implementationPreference }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 && payload.code === 'ORGANIZATION_EXISTS' && payload.data?.organization && payload.data?.membership) {
          onCompleted(payload.data);
          return;
        }
        throw new Error(payload.error || 'Não foi possível criar sua organização.');
      }

      let result = payload.data as OrganizationResult;
      if (logo) {
        const formData = new FormData();
        formData.set('organizationId', result.organization.id);
        formData.set('kind', 'logo');
        formData.set('file', logo);
        const assetResponse = await fetch('/api/organizations/assets', { method: 'POST', body: formData });
        const assetPayload = await assetResponse.json();
        if (assetResponse.ok && assetPayload.data?.organization) result = { ...result, organization: assetPayload.data.organization };
      }
      onCompleted(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível criar sua organização.');
    } finally {
      setLoading(false);
    }
  }

  if (!wizardOpen) return (
    <div className="onboarding-wrap organization-welcome-wrap">
      <section className="organization-welcome-card">
        <div className="organization-welcome-mark"><Icon name="briefcase" size={22} /></div>
        <p className="eyebrow">Seu próximo passo</p>
        <h1>Crie o espaço da sua empresa.</h1>
        <p>Seu acesso pessoal está pronto. Agora crie uma organização para gerenciar equipe, candidatos, processos e documentos em um único ambiente.</p>
        <div className="onboarding-email"><span>E-mail conectado</span><strong>{email || 'E-mail da sessão'}</strong></div>
        <button className="button button-primary" onClick={() => setWizardOpen(true)}>+ Criar minha organização <Icon name="arrow-up-right" size={16} /></button>
      </section>
    </div>
  );

  return (
    <div className="onboarding-wrap onboarding-flow-wrap">
      <section className="onboarding-card onboarding-flow-card organization-flow-card">
        <div className="onboarding-intro">
          <div className="onboarding-mark"><Icon name="briefcase" size={19} /></div>
          <p className="eyebrow">Sua organização · passo {step} de 3</p>
          <h1>{step === 1 ? 'Apresente sua empresa.' : step === 2 ? 'Vamos entender o contexto.' : 'Escolha como começar.'}</h1>
          <p>{step === 1 ? 'Comece com a identidade básica do espaço. Você poderá personalizar tudo depois.' : step === 2 ? 'Essas respostas ajudam a preparar o ambiente certo para o tamanho e o setor da sua equipe.' : 'Selecione os primeiros módulos para deixar o painel pronto para o seu dia a dia.'}</p>
          <div className="onboarding-progress" aria-label={`Passo ${step} de 3`}><span className="is-done" /><span className={step >= 2 ? 'is-done' : ''} /><span className={step >= 3 ? 'is-done' : ''} /></div>
        </div>

        {step < 3 && <form className="onboarding-form" onSubmit={nextStep}>
          {step === 1 && <><div className="field"><label htmlFor="organization-name">Nome da organização</label><input className="form-input" id="organization-name" autoComplete="organization" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Acme Tecnologia" /></div><div className="onboarding-field-grid"><div className="field"><label htmlFor="organization-trade-name">Nome fantasia <span>(opcional)</span></label><input className="form-input" id="organization-trade-name" value={tradeName} onChange={(event) => setTradeName(event.target.value)} placeholder="Como a empresa é conhecida" /></div><div className="field"><label htmlFor="organization-legal-name">Razão social <span>(opcional)</span></label><input className="form-input" id="organization-legal-name" value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="Nome jurídico da empresa" /></div></div><div className="field"><label htmlFor="organization-cnpj">CNPJ <span>(opcional)</span></label><input className="form-input" id="organization-cnpj" value={cnpj} onChange={(event) => setCnpj(event.target.value)} placeholder="00.000.000/0000-00" /></div><div className="field"><label htmlFor="organization-logo">Logo da organização <span>(opcional)</span></label><input className="form-input onboarding-file-input" id="organization-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} /><small>{logo ? logo.name : 'Envie um arquivo. Nunca usamos URL para imagem.'}</small></div></>}
          {step === 2 && <><div className="field"><label>Quantas pessoas trabalham na empresa?</label><div className="onboarding-choice-grid">{employeeRanges.map(([value, label]) => <button type="button" key={value} className={`onboarding-choice ${employeeRange === value ? 'is-selected' : ''}`} onClick={() => setEmployeeRange(value)}>{label}</button>)}</div></div><div className="field"><label>Qual é o setor?</label><div className="onboarding-choice-grid">{industries.map(([value, label]) => <button type="button" key={value} className={`onboarding-choice ${industry === value ? 'is-selected' : ''}`} onClick={() => setIndustry(value)}>{label}</button>)}</div></div><div className="field"><label>Existe uma pessoa ou equipe dedicada ao RH?</label><div className="onboarding-choice-grid"><button type="button" className={`onboarding-choice ${hasDedicatedHr === true ? 'is-selected' : ''}`} onClick={() => setHasDedicatedHr(true)}>Sim</button><button type="button" className={`onboarding-choice ${hasDedicatedHr === false ? 'is-selected' : ''}`} onClick={() => setHasDedicatedHr(false)}>Ainda não</button></div></div></>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="onboarding-form-actions"><button className="button button-secondary" type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>Voltar</button><button className="button button-primary" type="submit">Continuar <Icon name="arrow-up-right" size={16} /></button></div>
        </form>}

        {step === 3 && <div className="onboarding-form"><div className="field"><label>Quais módulos você quer começar usando?</label><div className="onboarding-choice-stack">{modules.map(([value, label]) => <button type="button" key={value} className={`onboarding-choice ${initialModules.includes(value) ? 'is-selected' : ''}`} onClick={() => toggleModule(value)}>{label}</button>)}</div></div><div className="field"><label>Como prefere implementar?</label><div className="onboarding-choice-grid"><button type="button" className={`onboarding-choice ${implementationPreference === 'guided' ? 'is-selected' : ''}`} onClick={() => setImplementationPreference('guided')}>Quero orientação</button><button type="button" className={`onboarding-choice ${implementationPreference === 'self_service' ? 'is-selected' : ''}`} onClick={() => setImplementationPreference('self_service')}>Vou explorar sozinho</button></div></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="onboarding-form-actions"><button className="button button-secondary" type="button" onClick={() => setStep(2)}>Voltar</button><button className="button button-primary" type="button" onClick={() => void submit()} disabled={loading}>{loading ? 'Criando espaço…' : 'Criar minha organização'} <Icon name="arrow-up-right" size={16} /></button></div><p className="onboarding-note">Você será administrador deste espaço e poderá convidar sua equipe e ajustar a identidade da organização depois.</p></div>}
      </section>
    </div>
  );
}
