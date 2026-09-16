'use client';

import { Icon } from '@/components/ui/icon';
import { useEffect, useState } from 'react';

type Company = { id: string; name: string; is_active: boolean };
type Vacancy = { id: string; title: string; department: string | null; unit: string | null; quantity: number; company_id: string | null; is_active: boolean; created_at: string };
type VacancyForm = { title: string; department: string; unit: string; quantity: string; company_id: string };
const emptyForm: VacancyForm = { title: '', department: '', unit: '', quantity: '1', company_id: '' };

export function VacanciesClient() {
  const [organizationId, setOrganizationId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok || !mePayload.data?.organization?.id) throw new Error(mePayload.error || 'Seu usuário ainda não está associado a uma organização.');
        const id = mePayload.data.organization.id as string;
        const [vacancyResponse, companyResponse] = await Promise.all([
          fetch(`/api/vacancies?organizationId=${id}&activeOnly=false`, { cache: 'no-store' }),
          fetch(`/api/companies?organizationId=${id}`, { cache: 'no-store' }),
        ]);
        const [vacancyPayload, companyPayload] = await Promise.all([vacancyResponse.json(), companyResponse.json()]);
        if (!vacancyResponse.ok) throw new Error(vacancyPayload.error || 'Não foi possível carregar as vagas.');
        if (!companyResponse.ok) throw new Error(companyPayload.error || 'Não foi possível carregar as empresas.');
        if (active) { setOrganizationId(id); setVacancies(vacancyPayload.data ?? []); setCompanies(companyPayload.data ?? []); }
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as vagas.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);

  function update(field: keyof VacancyForm, value: string) { setForm((current) => ({ ...current, [field]: value })); setFormError(''); }

  async function createVacancy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return;
    setSaving(true); setFormError('');
    try {
      const response = await fetch('/api/vacancies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, title: form.title, department: form.department || null, unit: form.unit || null, quantity: Number(form.quantity), company_id: form.company_id || null }) });
      const payload = await response.json();
      if (!response.ok) { setFormError(payload.fields?.join(' ') || payload.error || 'Não foi possível criar a vaga.'); return; }
      setVacancies((current) => [payload.data, ...current]); setForm(emptyForm);
    } catch { setFormError('Não foi possível criar a vaga. Tente novamente.'); }
    finally { setSaving(false); }
  }

  async function toggleVacancy(vacancy: Vacancy) {
    setToggling(vacancy.id); setError('');
    try {
      const response = await fetch(`/api/vacancies/${vacancy.id}?organizationId=${organizationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !vacancy.is_active }) });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || 'Não foi possível atualizar a vaga.'); return; }
      setVacancies((current) => current.map((item) => item.id === vacancy.id ? payload.data : item));
    } catch { setError('Não foi possível atualizar a vaga. Tente novamente.'); }
    finally { setToggling(''); }
  }

  const openPositions = vacancies.filter((vacancy) => vacancy.is_active).reduce((sum, vacancy) => sum + vacancy.quantity, 0);
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));

  return <div><div className="page-heading"><div><p className="eyebrow">Fluxo seletivo</p><h1>Vagas</h1><p>Defina o volume de contratação e a empresa responsável por cada oportunidade.</p></div><div className="heading-stat"><strong>{openPositions}</strong><span>posições abertas</span></div></div>{error && <div className="form-error" role="alert">{error}</div>}<section className="panel vacancy-create-panel"><div className="panel-header"><div><h2>Nova vaga</h2><p>Quantidade e empresa ficam disponíveis ao criar um processo.</p></div><Icon name="briefcase" /></div><form className="vacancy-form vacancy-form-expanded" onSubmit={createVacancy}><div className="field"><label htmlFor="vacancy-title">Cargo *</label><input className="form-input" id="vacancy-title" required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Ex.: Motorista" /></div><div className="field"><label htmlFor="vacancy-company">Empresa contratante</label><select className="form-select" id="vacancy-company" value={form.company_id} onChange={(event) => update('company_id', event.target.value)}><option value="">Selecionar empresa</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></div><div className="field"><label htmlFor="vacancy-quantity">Quantidade de vagas *</label><input className="form-input" id="vacancy-quantity" required min="1" max="100000" type="number" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /></div><div className="field"><label htmlFor="vacancy-department">Departamento</label><input className="form-input" id="vacancy-department" value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="Ex.: Operações" /></div><div className="field"><label htmlFor="vacancy-unit">Unidade</label><input className="form-input" id="vacancy-unit" value={form.unit} onChange={(event) => update('unit', event.target.value)} placeholder="Ex.: São Paulo" /></div><button className="button button-primary" disabled={saving || !organizationId}>{saving ? 'Criando…' : 'Criar vaga'}<Icon name="plus" size={16} /></button></form>{formError && <div className="form-error" role="alert" style={{ marginTop: 14 }}>{formError}</div>}{companies.length === 0 && <p className="panel-note">Nenhuma empresa cadastrada ainda. Você pode <a className="text-link" href="/empresas">cadastrar uma empresa</a> e voltar para associá-la à vaga.</p>}</section><section className="panel vacancy-list-panel"><div className="panel-header"><div><h2>Vagas cadastradas</h2><p>{vacancies.length} {vacancies.length === 1 ? 'vaga' : 'vagas'} · {openPositions} posições ativas</p></div><Icon name="list-checks" /></div>{loading ? <div className="loading-state">Carregando vagas</div> : vacancies.length === 0 ? <div className="empty-state"><strong>Nenhuma vaga cadastrada</strong><p>Crie a primeira oportunidade para iniciar os processos.</p></div> : <div className="vacancy-list">{vacancies.map((vacancy) => <div className="vacancy-row vacancy-row-rich" key={vacancy.id}><span className="vacancy-icon"><Icon name="briefcase" size={17} /></span><span className="vacancy-copy"><strong>{vacancy.title}</strong><span>{companyNames.get(vacancy.company_id ?? '') || 'Empresa não definida'}{[vacancy.department, vacancy.unit].filter(Boolean).map((value) => ` · ${value}`).join('')}</span></span><span className="vacancy-quantity"><strong>{vacancy.quantity}</strong><span>{vacancy.quantity === 1 ? 'posição' : 'posições'}</span></span><span className={`vacancy-state ${vacancy.is_active ? 'is-active' : 'is-inactive'}`}>{vacancy.is_active ? 'Ativa' : 'Inativa'}</span><button className="button button-ghost vacancy-toggle" onClick={() => toggleVacancy(vacancy)} disabled={toggling === vacancy.id}>{toggling === vacancy.id ? 'Salvando…' : vacancy.is_active ? 'Desativar' : 'Reativar'}</button></div>)}</div>}</section></div>;
}
