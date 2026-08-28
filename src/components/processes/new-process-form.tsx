'use client';

import { Icon } from '@/components/ui/icon';
import { statusLabel } from '@/components/ui/status-badge';
import { processStatuses, candidateSources } from '@/lib/processes/constants';
import { useEffect, useState } from 'react';

type Process = { id: string; candidate_id: string; vacancy_id: string | null; status: string; started_at: string; finished_at: string | null; withdrawal_reason_code: string | null; withdrawal_notes: string | null; can_apply_again: string | null; updated_at: string };
type Vacancy = { id: string; title: string; department: string | null; unit: string | null };

export function NewProcessForm({ organizationId, candidateId, onCreated, onCancel }: { organizationId: string; candidateId: string; onCreated: (process: Process) => void; onCancel: () => void }) {
  const [status, setStatus] = useState('new');
  const [source, setSource] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/vacancies?organizationId=${organizationId}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setVacancies(payload.data ?? []))
      .catch(() => setVacancies([]));
  }, [organizationId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/processes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, candidate_id: candidateId, vacancy_id: vacancyId || null, status, source: source || null }) });
      const payload = await response.json();
      if (!response.ok) { setError(payload.fields?.join(' ') || payload.error || 'Não foi possível criar o processo.'); return; }
      onCreated(payload.data);
    } catch { setError('Não foi possível criar o processo. Tente novamente.'); }
    finally { setLoading(false); }
  }

  return <form className="inline-form-card" onSubmit={submit}><div className="inline-form-heading"><div><strong>Novo processo seletivo</strong><span>Crie uma nova participação para este candidato.</span></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Fechar"><Icon name="x" size={16} /></button></div><div className="form-grid"><div className="field field-full"><label htmlFor="new-process-vacancy">Vaga</label><select className="form-select" id="new-process-vacancy" value={vacancyId} onChange={(event) => setVacancyId(event.target.value)}><option value="">Processo sem vaga definida</option>{vacancies.map((vacancy) => <option value={vacancy.id} key={vacancy.id}>{vacancy.title}{vacancy.unit ? ` · ${vacancy.unit}` : ''}</option>)}</select></div><div className="field"><label htmlFor="new-process-status">Status inicial</label><select className="form-select" id="new-process-status" value={status} onChange={(event) => setStatus(event.target.value)}>{processStatuses.map((item) => <option value={item} key={item}>{statusLabel(item)}</option>)}</select></div><div className="field"><label htmlFor="new-process-source">Origem</label><select className="form-select" id="new-process-source" value={source} onChange={(event) => setSource(event.target.value)}><option value="">Não informado</option>{candidateSources.map((item) => <option value={item} key={item}>{sourceLabel(item)}</option>)}</select></div></div>{error && <div className="form-error" role="alert" style={{ marginTop: 14 }}>{error}</div>}<div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button><button className="button button-primary" disabled={loading}>{loading ? 'Criando…' : 'Criar processo'}<Icon name="git-branch" size={16} /></button></div></form>;
}

function sourceLabel(source: string) { return ({ linkedin: 'LinkedIn', indeed: 'Indeed', referral: 'Indicação', whatsapp: 'WhatsApp', talent_pool: 'Banco de talentos', other: 'Outro' } as Record<string, string>)[source] ?? source; }
