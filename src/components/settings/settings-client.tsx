'use client';

import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type SettingsData = {
  user: { email: string | null };
  profile: { full_name: string } | null;
  membership: { role: string } | null;
  organization: { id: string; name: string; slug: string } | null;
};

type Vacancy = {
  id: string;
  title: string;
  department: string | null;
  unit: string | null;
  is_active: boolean;
  created_at: string;
};

type VacancyForm = {
  title: string;
  department: string;
  unit: string;
};

const emptyVacancyForm: VacancyForm = { title: '', department: '', unit: '' };

export function SettingsClient() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [vacancyForm, setVacancyForm] = useState(emptyVacancyForm);
  const [loading, setLoading] = useState(true);
  const [vacancyLoading, setVacancyLoading] = useState(false);
  const [savingVacancy, setSavingVacancy] = useState(false);
  const [togglingVacancy, setTogglingVacancy] = useState('');
  const [error, setError] = useState('');
  const [vacancyError, setVacancyError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok) throw new Error(mePayload.error || 'Não foi possível carregar as configurações.');
        if (!active) return;

        const settings = mePayload.data as SettingsData;
        setData(settings);

        if (settings.organization?.id) {
          setVacancyLoading(true);
          const vacanciesResponse = await fetch(
            `/api/vacancies?organizationId=${settings.organization.id}&activeOnly=false`,
            { cache: 'no-store' },
          );
          const vacanciesPayload = await vacanciesResponse.json();
          if (!vacanciesResponse.ok) throw new Error(vacanciesPayload.error || 'Não foi possível carregar as vagas.');
          if (active) setVacancies(vacanciesPayload.data ?? []);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.');
      } finally {
        if (active) {
          setLoading(false);
          setVacancyLoading(false);
        }
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const organizationId = data?.organization?.id ?? '';
  const role = data?.membership?.role;
  const canManageVacancies = role === 'admin' || role === 'recruiter';

  function updateVacancyForm(field: keyof VacancyForm, value: string) {
    setVacancyForm((current) => ({ ...current, [field]: value }));
  }

  async function createVacancy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;

    setSavingVacancy(true);
    setVacancyError('');
    try {
      const response = await fetch('/api/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...vacancyForm }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setVacancyError(payload.fields?.join(' ') || payload.error || 'Não foi possível criar a vaga.');
        return;
      }

      setVacancies((current) => [payload.data, ...current]);
      setVacancyForm(emptyVacancyForm);
    } catch {
      setVacancyError('Não foi possível criar a vaga. Tente novamente.');
    } finally {
      setSavingVacancy(false);
    }
  }

  async function toggleVacancy(vacancy: Vacancy) {
    if (!organizationId) return;

    setTogglingVacancy(vacancy.id);
    setVacancyError('');
    try {
      const response = await fetch(`/api/vacancies/${vacancy.id}?organizationId=${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !vacancy.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setVacancyError(payload.fields?.join(' ') || payload.error || 'Não foi possível atualizar a vaga.');
        return;
      }

      setVacancies((current) => current.map((item) => item.id === vacancy.id ? payload.data : item));
    } catch {
      setVacancyError('Não foi possível atualizar a vaga. Tente novamente.');
    } finally {
      setTogglingVacancy('');
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Configurações</h1>
          <p>Confira o contexto de acesso e mantenha as vagas que alimentam os processos seletivos.</p>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {loading ? <div className="loading-state">Carregando configurações</div> : (
        <div className="settings-stack">
          <div className="detail-grid">
            <section className="panel">
              <div className="panel-header">
                <div><h2>Organização atual</h2><p>Os dados exibidos respeitam este vínculo.</p></div>
                <Icon name="briefcase" />
              </div>
              <dl className="detail-list">
                <div><dt>Organização</dt><dd>{data?.organization?.name ?? 'Não configurada'}</dd></div>
                <div><dt>Slug</dt><dd className="mono">{data?.organization?.slug ?? '—'}</dd></div>
                <div><dt>Seu papel</dt><dd>{roleLabel(role)}</dd></div>
              </dl>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div><h2>Seu acesso</h2><p>Identidade autenticada pelo Supabase Auth.</p></div>
                <Link className="text-link" href="/perfil">Editar perfil <Icon name="arrow-up-right" size={14} /></Link>
              </div>
              <dl className="detail-list">
                <div><dt>Nome</dt><dd>{data?.profile?.full_name ?? 'Perfil não preenchido'}</dd></div>
                <div><dt>E-mail</dt><dd>{data?.user.email ?? 'Não disponível'}</dd></div>
              </dl>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Vagas disponíveis</h2>
                <p>Vagas ativas aparecem na criação de um novo processo.</p>
              </div>
              <Icon name="briefcase" />
            </div>

            {canManageVacancies && (
              <form className="vacancy-form" onSubmit={createVacancy}>
                <div className="field">
                  <label htmlFor="vacancy-title">Nova vaga</label>
                  <input className="form-input" id="vacancy-title" required value={vacancyForm.title} onChange={(event) => updateVacancyForm('title', event.target.value)} placeholder="Ex.: Motorista" />
                </div>
                <div className="field">
                  <label htmlFor="vacancy-department">Departamento</label>
                  <input className="form-input" id="vacancy-department" value={vacancyForm.department} onChange={(event) => updateVacancyForm('department', event.target.value)} placeholder="Ex.: Operações" />
                </div>
                <div className="field">
                  <label htmlFor="vacancy-unit">Unidade</label>
                  <input className="form-input" id="vacancy-unit" value={vacancyForm.unit} onChange={(event) => updateVacancyForm('unit', event.target.value)} placeholder="Ex.: São Paulo" />
                </div>
                <button className="button button-primary" disabled={savingVacancy || !organizationId}>
                  <Icon name="plus" size={16} />{savingVacancy ? 'Criando…' : 'Criar vaga'}
                </button>
              </form>
            )}

            {vacancyError && <div className="form-error" role="alert" style={{ marginBottom: 14 }}>{vacancyError}</div>}

            {vacancyLoading ? <div className="loading-state">Carregando vagas</div> : vacancies.length === 0 ? (
              <div className="empty-state"><strong>Nenhuma vaga cadastrada</strong><p>Crie a primeira vaga para começar a organizar os processos.</p></div>
            ) : (
              <div className="vacancy-list">
                {vacancies.map((vacancy) => (
                  <div className="vacancy-row" key={vacancy.id}>
                    <span className="vacancy-icon"><Icon name="briefcase" size={17} /></span>
                    <span className="vacancy-copy"><strong>{vacancy.title}</strong><span>{[vacancy.department, vacancy.unit].filter(Boolean).join(' · ') || 'Sem departamento ou unidade'}</span></span>
                    <span className={`vacancy-state ${vacancy.is_active ? 'is-active' : 'is-inactive'}`}>{vacancy.is_active ? 'Ativa' : 'Inativa'}</span>
                    {canManageVacancies && <button className="button button-ghost vacancy-toggle" onClick={() => toggleVacancy(vacancy)} disabled={togglingVacancy === vacancy.id}>{togglingVacancy === vacancy.id ? 'Salvando…' : vacancy.is_active ? 'Desativar' : 'Reativar'}</button>}
                  </div>
                ))}
              </div>
            )}

            {!canManageVacancies && <p className="panel-note">Seu papel permite consulta. Solicite ao administrador uma alteração nas vagas.</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function roleLabel(role: string | undefined) {
  return role === 'admin' ? 'Administrador' : role === 'recruiter' ? 'Recrutador' : role === 'viewer' ? 'Visualizador' : 'Sem papel';
}
