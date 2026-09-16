'use client';

import { Icon } from '@/components/ui/icon';
import { useEffect, useRef, useState } from 'react';

type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  logo_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CompanyForm = { name: string; legal_name: string; cnpj: string; logo: File | null };
const emptyForm: CompanyForm = { name: '', legal_name: '', cnpj: '', logo: null };

export function CompaniesClient() {
  const [organizationId, setOrganizationId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok || !mePayload.data?.organization?.id) throw new Error(mePayload.error || 'Seu usuário ainda não está associado a uma organização.');
        const id = mePayload.data.organization.id as string;
        const response = await fetch('/api/companies?organizationId=' + id + '&activeOnly=false', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar as empresas.');
        if (active) { setOrganizationId(id); setCompanies(payload.data ?? []); }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as empresas.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function update(field: 'name' | 'legal_name' | 'cnpj', value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  function selectLogo(file: File | null) {
    setForm((current) => ({ ...current, logo: file }));
    setFormError('');
  }

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    setSaving(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.set('organizationId', organizationId);
      formData.set('name', form.name);
      formData.set('legal_name', form.legal_name);
      formData.set('cnpj', form.cnpj);
      if (form.logo) formData.set('logo', form.logo);

      const response = await fetch('/api/companies', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) { setFormError(payload.fields?.join(' ') || payload.error || 'Não foi possível cadastrar a empresa.'); return; }
      setCompanies((current) => [payload.data, ...current]);
      setForm(emptyForm);
      if (logoInputRef.current) logoInputRef.current.value = '';
    } catch { setFormError('Não foi possível cadastrar a empresa. Tente novamente.'); }
    finally { setSaving(false); }
  }

  async function uploadCompanyLogo(company: Company, file: File | null) {
    if (!organizationId || !file) return;
    setUploadingLogo(company.id);
    setError('');
    try {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/companies/' + company.id + '/logo?organizationId=' + organizationId, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível enviar a logo da empresa.'); return; }
      setCompanies((current) => current.map((item) => item.id === company.id ? payload.data : item));
    } catch { setError('Não foi possível enviar a logo da empresa. Tente novamente.'); }
    finally { setUploadingLogo(''); }
  }

  async function toggleCompany(company: Company) {
    setToggling(company.id);
    setError('');
    try {
      const response = await fetch('/api/companies/' + company.id + '?organizationId=' + organizationId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !company.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível atualizar a empresa.'); return; }
      setCompanies((current) => current.map((item) => item.id === company.id ? payload.data : item));
    } catch { setError('Não foi possível atualizar a empresa. Tente novamente.'); }
    finally { setToggling(''); }
  }

  const activeCount = companies.filter((company) => company.is_active).length;

  return <div>
    <div className="page-heading"><div><p className="eyebrow">Cadastros de apoio</p><h1>Empresas</h1><p>Cadastre as empresas contratantes para deixar cada vaga ligada ao contexto certo.</p></div><div className="heading-stat"><strong>{activeCount}</strong><span>ativas</span></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="detail-grid company-page-grid">
      <section className="panel company-intro-panel"><div className="company-intro-symbol"><Icon name="building" size={23} /></div><p className="eyebrow">Base contratante</p><h2>Uma empresa, vários processos.</h2><p>Use o mesmo cadastro em várias vagas e mantenha o histórico seletivo organizado por organização.</p></section>
      <section className="panel"><div className="panel-header"><div><h2>Nova empresa</h2><p>Esses dados aparecem na seleção de empresa da vaga.</p></div><Icon name="plus" /></div><form className="form-grid" onSubmit={createCompany}>
        <div className="field field-full"><label htmlFor="company-name">Nome exibido *</label><input className="form-input" id="company-name" required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ex.: Vieira Couto Transportes" /></div>
        <div className="field field-full"><label htmlFor="company-legal-name">Razão social <span className="muted">(opcional)</span></label><input className="form-input" id="company-legal-name" value={form.legal_name} onChange={(event) => update('legal_name', event.target.value)} placeholder="Ex.: Vieira Couto Ltda." /></div>
        <div className="field"><label htmlFor="company-cnpj">CNPJ <span className="muted">(opcional)</span></label><input className="form-input mono" id="company-cnpj" inputMode="numeric" value={form.cnpj} onChange={(event) => update('cnpj', event.target.value)} placeholder="00.000.000/0000-00" /></div>
        <div className="field field-full"><span className="field-label">Logo da empresa <span className="muted">(opcional)</span></span><label className="company-logo-picker" htmlFor="company-logo">
          <span className="company-logo-picker-icon"><Icon name="image" size={18} /></span>
          <span className="company-logo-picker-copy"><strong>{form.logo ? form.logo.name : 'Escolher arquivo'}</strong><small>PNG, JPG, WEBP ou SVG · até 5 MB</small></span>
          <span className="company-logo-picker-action">{form.logo ? 'Trocar' : 'Selecionar'}</span>
          <input ref={logoInputRef} id="company-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => selectLogo(event.target.files?.[0] ?? null)} />
        </label></div>
        <div className="form-actions company-form-actions"><button className="button button-primary" disabled={saving || !organizationId}>{saving ? 'Salvando…' : 'Cadastrar empresa'}<Icon name="check" size={16} /></button></div>
      </form>{formError && <div className="form-error" role="alert" style={{ marginTop: 14 }}>{formError}</div>}</section>
    </div>
    <section className="panel company-list-panel"><div className="panel-header"><div><h2>Empresas cadastradas</h2><p>{companies.length} {companies.length === 1 ? 'cadastro' : 'cadastros'} nesta organização.</p></div><Icon name="building" /></div>{loading ? <div className="loading-state">Carregando empresas</div> : companies.length === 0 ? <div className="empty-state"><strong>Nenhuma empresa cadastrada</strong><p>Cadastre a primeira para associá-la às vagas.</p></div> : <div className="company-list">{companies.map((company) => <div className="company-row" key={company.id}>
      <span className={'company-row-icon' + (company.logo_path ? ' company-row-logo' : '')}>{company.logo_path ? <img src={'/api/companies/' + company.id + '/logo?v=' + encodeURIComponent(company.updated_at)} alt="" /> : <Icon name="building" size={17} />}</span>
      <span className="company-row-copy"><strong>{company.name}</strong><span>{company.legal_name || (company.cnpj ? formatCnpj(company.cnpj) : 'Sem razão social ou CNPJ')}</span></span>
      <span className={'vacancy-state ' + (company.is_active ? 'is-active' : 'is-inactive')}>{company.is_active ? 'Ativa' : 'Inativa'}</span>
      <label className="company-logo-action"><Icon name={uploadingLogo === company.id ? 'rotate-ccw' : 'upload'} size={14} /><span>{uploadingLogo === company.id ? 'Enviando…' : company.logo_path ? 'Trocar logo' : 'Adicionar logo'}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploadingLogo === company.id} aria-label={company.logo_path ? 'Trocar logo de ' + company.name : 'Adicionar logo de ' + company.name} onChange={(event) => { const file = event.target.files?.[0] ?? null; event.currentTarget.value = ''; void uploadCompanyLogo(company, file); }} /></label>
      <button className="button button-ghost company-toggle" onClick={() => void toggleCompany(company)} disabled={toggling === company.id}>{toggling === company.id ? 'Salvando…' : company.is_active ? 'Desativar' : 'Reativar'}</button>
    </div>)}</div>}</section>
  </div>;
}

function formatCnpj(value: string) {
  const numbers = value.replace(/\D/g, '');
  return numbers.length === 14
    ? numbers.slice(0, 2) + '.' + numbers.slice(2, 5) + '.' + numbers.slice(5, 8) + '/' + numbers.slice(8, 12) + '-' + numbers.slice(12)
    : value;
}
