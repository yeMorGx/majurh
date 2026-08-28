'use client';

import { Icon } from '@/components/ui/icon';
import { StatusBadge, statusLabel } from '@/components/ui/status-badge';
import { processStatuses } from '@/lib/processes/constants';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Process = { id: string; candidate_id: string; status: string; vacancy_id: string | null; started_at: string; updated_at: string };

export function ProcessesClient() {
  const [organizationId, setOrganizationId] = useState('');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [status, setStatus] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [candidateNames, setCandidateNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { const params = new URLSearchParams(window.location.search); setStatus(params.get('status') ?? ''); setCandidateId(params.get('candidateId') ?? ''); fetch('/api/me', { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload.data; }).then((data) => { if (data.organization?.id) setOrganizationId(data.organization.id); else setError('Seu usuário ainda não está associado a uma organização.'); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seu acesso.')); }, []);

  useEffect(() => {
    if (!organizationId) { if (error) setLoading(false); return; }
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ organizationId, page: '1', pageSize: '100' }); if (status) params.set('status', status); if (candidateId) params.set('candidateId', candidateId);
    fetch(`/api/processes?${params}`, { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload; }).then(async (payload) => { if (!active) return; const list = payload.data ?? []; setProcesses(list); const ids = [...new Set(list.map((item: Process) => item.candidate_id))]; if (ids.length) { const candidates = await Promise.all(ids.map(async (id) => { const response = await fetch(`/api/candidates/${id}?organizationId=${organizationId}`, { cache: 'no-store' }); const result = await response.json(); return [id, result.data?.full_name ?? 'Candidato não identificado']; })); if (active) setCandidateNames(Object.fromEntries(candidates)); } }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os processos.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, status, candidateId, error]);

  return <div><div className="page-heading"><div><p className="eyebrow">Fluxo seletivo</p><h1>Processos</h1><p>Acompanhe cada participação sem misturar uma tentativa com outra.</p></div><div className="heading-actions"><Link href="/candidatos" className="button button-secondary"><Icon name="users" size={16} />Ver candidatos</Link></div></div>{error && <div className="form-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}<div className="screen-toolbar"><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status"><option value="">Todos os status</option>{processStatuses.map((item) => <option value={item} key={item}>{statusLabel(item)}</option>)}</select><span className="muted">{processes.length} {processes.length === 1 ? 'processo' : 'processos'}</span></div><section className="panel table-panel">{loading ? <div className="loading-state">Carregando processos</div> : processes.length === 0 ? <div className="empty-state"><strong>Nenhum processo encontrado</strong><p>{status ? 'Nenhuma participação usa este status.' : 'Crie um processo a partir do perfil de um candidato.'}</p></div> : <table className="data-table"><thead><tr><th>Candidato</th><th>Status</th><th>Início</th><th>Última atualização</th><th /></tr></thead><tbody>{processes.map((process) => <tr key={process.id}><td><Link href={`/candidatos/${process.candidate_id}`} className="candidate-cell"><strong>{candidateNames[process.candidate_id] ?? 'Carregando…'}</strong><span className="mono">processo {process.id.slice(0, 8)}</span></Link></td><td><StatusBadge status={process.status} /></td><td className="muted">{formatDate(process.started_at)}</td><td className="muted">{formatDate(process.updated_at)}</td><td><Link className="icon-button" href={`/candidatos/${process.candidate_id}?tab=processes`} aria-label="Abrir processo"><Icon name="chevron-right" size={16} /></Link></td></tr>)}</tbody></table>}</section></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
