'use client';

import { Icon } from '@/components/ui/icon';
import { useEffect, useState } from 'react';

type Company = { id: string; name: string; is_active: boolean };
type Vacancy = {
  id: string;
  title: string;
  department: string | null;
  unit: string | null;
  quantity: number;
  company_id: string | null;
  is_active: boolean;
  created_at: string;
};
type VacancyForm = { title: string; department: string; unit: string; quantity: string; company_id: string };
type VacancyEditForm = VacancyForm & { is_active: boolean };

const emptyForm: VacancyForm = { title: '', department: '', unit: '', quantity: '1', company_id: '' };

export function VacanciesClient() {
  const [organizationId, setOrganizationId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [editForm, setEditForm] = useState<VacancyEditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [toggling, setToggling] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [editError, setEditError] = useState('');
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok || !mePayload.data?.organization?.id) {
          throw new Error(mePayload.error || 'Seu usuário ainda não está associado a uma organização.');
        }

        const id = mePayload.data.organization.id as string;
        const [vacancyResponse, companyResponse] = await Promise.all([
          fetch(`/api/vacancies?organizationId=${id}&activeOnly=false`, { cache: 'no-store' }),
          fetch(`/api/companies?organizationId=${id}`, { cache: 'no-store' }),
        ]);
        const [vacancyPayload, companyPayload] = await Promise.all([vacancyResponse.json(), companyResponse.json()]);
        if (!vacancyResponse.ok) throw new Error(vacancyPayload.error || 'Não foi possível carregar as vagas.');
        if (!companyResponse.ok) throw new Error(companyPayload.error || 'Não foi possível carregar as empresas.');
        if (active) {
          setOrganizationId(id);
          setVacancies(vacancyPayload.data ?? []);
          setCompanies(companyPayload.data ?? []);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as vagas.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedVacancy) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !editSaving) closeEditDrawer();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedVacancy, editSaving]);

  function update(field: keyof VacancyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  function updateEdit(field: keyof VacancyEditForm, value: string | boolean) {
    setEditForm((current) => current ? { ...current, [field]: value } : current);
    setEditError('');
    setEditMessage('');
  }

  function openEditDrawer(vacancy: Vacancy) {
    setSelectedVacancy(vacancy);
    setEditForm(toEditForm(vacancy));
    setEditError('');
    setEditMessage('');
  }

  function closeEditDrawer() {
    if (editSaving) return;
    setSelectedVacancy(null);
    setEditForm(null);
    setEditError('');
    setEditMessage('');
  }

  async function createVacancy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch('/api/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          title: form.title,
          department: form.department || null,
          unit: form.unit || null,
          quantity: Number(form.quantity),
          company_id: form.company_id || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setFormError(payload.fields?.join(' ') || payload.error || 'Não foi possível criar a vaga.');
        return;
      }
      setVacancies((current) => [payload.data, ...current]);
      setForm(emptyForm);
    } catch {
      setFormError('Não foi possível criar a vaga. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function saveVacancy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !selectedVacancy || !editForm) return;
    setEditSaving(true);
    setEditError('');
    setEditMessage('');
    try {
      const response = await fetch(`/api/vacancies/${selectedVacancy.id}?organizationId=${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          department: editForm.department || null,
          unit: editForm.unit || null,
          quantity: Number(editForm.quantity),
          company_id: editForm.company_id || null,
          is_active: editForm.is_active,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setEditError(payload.fields?.join(' ') || payload.error || 'Não foi possível salvar a vaga.');
        return;
      }

      const updated = payload.data as Vacancy;
      setVacancies((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedVacancy(updated);
      setEditForm(toEditForm(updated));
      setEditMessage('Alterações salvas.');
    } catch {
      setEditError('Não foi possível salvar a vaga. Tente novamente.');
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleVacancy(vacancy: Vacancy) {
    setToggling(vacancy.id);
    setError('');
    try {
      const response = await fetch(`/api/vacancies/${vacancy.id}?organizationId=${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !vacancy.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Não foi possível atualizar a vaga.');
        return;
      }
      const updated = payload.data as Vacancy;
      setVacancies((current) => current.map((item) => item.id === vacancy.id ? updated : item));
      setSelectedVacancy((current) => current?.id === updated.id ? updated : current);
    } catch {
      setError('Não foi possível atualizar a vaga. Tente novamente.');
    } finally {
      setToggling('');
    }
  }

  const openPositions = vacancies.filter((vacancy) => vacancy.is_active).reduce((sum, vacancy) => sum + vacancy.quantity, 0);
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Fluxo seletivo</p>
          <h1>Vagas</h1>
          <p>Defina o volume de contratação e a empresa responsável por cada oportunidade.</p>
        </div>
        <div className="heading-stat"><strong>{openPositions}</strong><span>posições abertas</span></div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <section className="panel vacancy-create-panel">
        <div className="panel-header">
          <div><h2>Nova vaga</h2><p>Quantidade e empresa ficam disponíveis ao criar um processo.</p></div>
          <Icon name="briefcase" />
        </div>
        <form className="vacancy-form vacancy-form-expanded" onSubmit={createVacancy}>
          <div className="field"><label htmlFor="vacancy-title">Cargo *</label><input className="form-input" id="vacancy-title" required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Ex.: Motorista" /></div>
          <div className="field"><label htmlFor="vacancy-company">Empresa contratante</label><select className="form-select" id="vacancy-company" value={form.company_id} onChange={(event) => update('company_id', event.target.value)}><option value="">Selecionar empresa</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></div>
          <div className="field"><label htmlFor="vacancy-quantity">Quantidade de vagas *</label><input className="form-input" id="vacancy-quantity" required min="1" max="100000" type="number" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /></div>
          <div className="field"><label htmlFor="vacancy-department">Departamento</label><input className="form-input" id="vacancy-department" value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="Ex.: Operações" /></div>
          <div className="field"><label htmlFor="vacancy-unit">Unidade</label><input className="form-input" id="vacancy-unit" value={form.unit} onChange={(event) => update('unit', event.target.value)} placeholder="Ex.: São Paulo" /></div>
          <button className="button button-primary" disabled={saving || !organizationId}>{saving ? 'Criando…' : 'Criar vaga'}<Icon name="plus" size={16} /></button>
        </form>
        {formError && <div className="form-error" role="alert" style={{ marginTop: 14 }}>{formError}</div>}
        {companies.length === 0 && <p className="panel-note">Nenhuma empresa cadastrada ainda. Você pode <a className="text-link" href="/empresas">cadastrar uma empresa</a> e voltar para associá-la à vaga.</p>}
      </section>

      <section className="panel vacancy-list-panel">
        <div className="panel-header">
          <div><h2>Vagas cadastradas</h2><p>{vacancies.length} {vacancies.length === 1 ? 'vaga' : 'vagas'} · {openPositions} posições ativas</p></div>
          <Icon name="list-checks" />
        </div>
        {loading ? <div className="loading-state">Carregando vagas</div> : vacancies.length === 0 ? <div className="empty-state"><strong>Nenhuma vaga cadastrada</strong><p>Crie a primeira oportunidade para iniciar os processos.</p></div> : <div className="vacancy-list">{vacancies.map((vacancy) => <div className="vacancy-row vacancy-row-rich" key={vacancy.id}>
          <span className="vacancy-icon"><Icon name="briefcase" size={17} /></span>
          <span className="vacancy-copy"><strong>{vacancy.title}</strong><span>{companyNames.get(vacancy.company_id ?? '') || 'Empresa não definida'}{[vacancy.department, vacancy.unit].filter(Boolean).map((value) => ` · ${value}`).join('')}</span></span>
          <span className="vacancy-quantity"><strong>{vacancy.quantity}</strong><span>{vacancy.quantity === 1 ? 'posição' : 'posições'}</span></span>
          <span className={`vacancy-state ${vacancy.is_active ? 'is-active' : 'is-inactive'}`}>{vacancy.is_active ? 'Ativa' : 'Inativa'}</span>
          <span className="vacancy-row-actions">
            <button className="button button-secondary vacancy-edit" onClick={() => openEditDrawer(vacancy)}><Icon name="edit" size={15} />Editar</button>
            <button className="button button-ghost vacancy-toggle" onClick={() => void toggleVacancy(vacancy)} disabled={toggling === vacancy.id}>{toggling === vacancy.id ? 'Salvando…' : vacancy.is_active ? 'Desativar' : 'Reativar'}</button>
          </span>
        </div>)}</div>}
      </section>

      {selectedVacancy && editForm && <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditDrawer(); }}>
        <aside className="vacancy-edit-drawer" role="dialog" aria-modal="true" aria-labelledby="vacancy-edit-title" aria-describedby="vacancy-edit-description" onMouseDown={(event) => event.stopPropagation()}>
          <header className="drawer-header">
            <div><span className="drawer-kicker">Detalhes da oportunidade</span><h2 id="vacancy-edit-title">Editar vaga</h2><p id="vacancy-edit-description">Atualize os dados sem sair da lista de vagas.</p></div>
            <button type="button" className="icon-button drawer-close" onClick={closeEditDrawer} aria-label="Fechar edição"><Icon name="x" size={18} /></button>
          </header>
          <form className="drawer-form" onSubmit={saveVacancy}>
            <div className="drawer-form-body">
              <div className="drawer-context"><span className="drawer-context-icon"><Icon name="briefcase" size={18} /></span><div><strong>{selectedVacancy.title}</strong><span>Vaga cadastrada no fluxo seletivo</span></div></div>
              <div className="field"><label htmlFor="edit-vacancy-title">Cargo *</label><input autoFocus className="form-input" id="edit-vacancy-title" required minLength={2} maxLength={120} value={editForm.title} onChange={(event) => updateEdit('title', event.target.value)} placeholder="Ex.: Motorista" /></div>
              <div className="field"><label htmlFor="edit-vacancy-company">Empresa contratante</label><select className="form-select" id="edit-vacancy-company" value={editForm.company_id} onChange={(event) => updateEdit('company_id', event.target.value)}><option value="">Selecionar empresa</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></div>
              <div className="drawer-form-grid"><div className="field"><label htmlFor="edit-vacancy-quantity">Quantidade *</label><input className="form-input" id="edit-vacancy-quantity" required min="1" max="100000" type="number" value={editForm.quantity} onChange={(event) => updateEdit('quantity', event.target.value)} /></div><div className="field"><label htmlFor="edit-vacancy-department">Departamento</label><input className="form-input" id="edit-vacancy-department" maxLength={120} value={editForm.department} onChange={(event) => updateEdit('department', event.target.value)} placeholder="Ex.: Operações" /></div></div>
              <div className="field"><label htmlFor="edit-vacancy-unit">Unidade</label><input className="form-input" id="edit-vacancy-unit" maxLength={120} value={editForm.unit} onChange={(event) => updateEdit('unit', event.target.value)} placeholder="Ex.: São Paulo" /></div>
              <label className="drawer-switch"><span><strong>Vaga ativa</strong><small>Disponível para novos processos seletivos.</small></span><input type="checkbox" checked={editForm.is_active} onChange={(event) => updateEdit('is_active', event.target.checked)} /><i aria-hidden="true" /></label>
              {editError && <div className="form-error" role="alert">{editError}</div>}
              {editMessage && <div className="form-success" role="status">{editMessage}</div>}
            </div>
            <footer className="drawer-footer"><span className="drawer-footer-hint"><Icon name="command" size={14} />Esc para fechar</span><div><button type="button" className="button button-secondary" onClick={closeEditDrawer} disabled={editSaving}>Cancelar</button><button className="button button-primary" disabled={editSaving}>{editSaving ? 'Salvando…' : 'Salvar alterações'}<Icon name="check" size={16} /></button></div></footer>
          </form>
        </aside>
      </div>}
    </div>
  );
}

function toEditForm(vacancy: Vacancy): VacancyEditForm {
  return {
    title: vacancy.title,
    department: vacancy.department ?? '',
    unit: vacancy.unit ?? '',
    quantity: String(vacancy.quantity),
    company_id: vacancy.company_id ?? '',
    is_active: vacancy.is_active,
  };
}
