'use client';

import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Candidate = { id: string; full_name: string; cpf: string; phone: string | null; email: string | null; city: string | null; state: string | null; updated_at: string };
type MeData = { organization: { id: string; name: string } | null };

export function CandidatesClient() {
  const [organizationId, setOrganizationId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload.data as MeData; }).then((data) => { if (data.organization) setOrganizationId(data.organization.id); else setError('Seu usuário ainda não está associado a uma organização.'); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seu acesso.'));
  }, []);

  useEffect(() => {
    if (!organizationId) { if (error) setLoading(false); return; }
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ organizationId, page: '1', pageSize: '100' });
    if (query) params.set('q', query);
    fetch(`/api/candidates?${params.toString()}`, { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload; }).then((payload) => { if (active) setCandidates(payload.data ?? []); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os candidatos.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, query, error]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setQuery(search.trim()); }

  return <div><div className="page-heading"><div><p className="eyebrow">Base de pessoas</p><h1>Candidatos</h1><p>Uma ficha permanente para cada pessoa, com todos os processos ao longo do tempo.</p></div><div className="heading-actions"><Link href="/candidatos/novo" className="button button-primary"><Icon name="plus" size={17} />Adicionar candidato</Link></div></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="screen-toolbar"><form className="search-field" onSubmit={handleSearch}><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, CPF ou telefone" aria-label="Buscar candidatos" /><button className="icon-button" aria-label="Buscar"><Icon name="arrow-up-right" size={15} /></button></form><span className="muted">{candidates.length} {candidates.length === 1 ? 'candidato' : 'candidatos'}</span></div><section className="panel table-panel">{loading ? <div className="loading-state">Carregando candidatos</div> : candidates.length === 0 ? <div className="empty-state"><strong>{query ? 'Nenhum candidato encontrado' : 'Ainda não há candidatos'}</strong><p>{query ? 'Tente outro nome ou telefone.' : 'Cadastre o primeiro para começar o histórico.'}</p>{!query && <Link className="button button-primary" href="/candidatos/novo" style={{ marginTop: 16 }}>Adicionar candidato</Link>}</div> : <table className="data-table"><thead><tr><th>Nome</th><th>Contato</th><th>Localidade</th><th>Atualizado</th><th aria-label="Ações" /></tr></thead><tbody>{candidates.map((candidate) => <tr key={candidate.id}><td><Link href={`/candidatos/${candidate.id}`} className="candidate-cell"><strong>{candidate.full_name}</strong><span className="mono">CPF {maskCpf(candidate.cpf)}</span></Link></td><td><span>{candidate.phone || 'Sem telefone'}</span><span className="muted" style={{ display: 'block', fontSize: 12 }}>{candidate.email || 'Sem e-mail'}</span></td><td className="muted">{candidate.city ? `${candidate.city}${candidate.state ? ` · ${candidate.state}` : ''}` : 'Não informado'}</td><td className="muted">{formatDate(candidate.updated_at)}</td><td><Link className="icon-button" href={`/candidatos/${candidate.id}`} aria-label={`Abrir ${candidate.full_name}`}><Icon name="chevron-right" size={16} /></Link></td></tr>)}</tbody></table>}</section></div>;
}

function maskCpf(value: string) { const numbers = value.replace(/\D/g, ''); return numbers.length === 11 ? `***.***.${numbers.slice(6, 9)}-${numbers.slice(9)}` : '***'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
