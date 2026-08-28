'use client';

import { Icon } from '@/components/ui/icon';
import { StatusBadge, statusLabel } from '@/components/ui/status-badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Document = { id: string; candidate_id: string; process_id: string | null; document_type: string; status: string; original_name: string | null; mime_type: string | null; size_bytes: number | null; created_at: string };

export function DocumentsClient() {
  const [organizationId, setOrganizationId] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [candidateNames, setCandidateNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState('');

  useEffect(() => { const params = new URLSearchParams(window.location.search); setStatus(params.get('status') ?? ''); fetch('/api/me', { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload.data; }).then((data) => { if (data.organization?.id) setOrganizationId(data.organization.id); else setError('Seu usuário ainda não está associado a uma organização.'); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seu acesso.')); }, []);

  useEffect(() => {
    if (!organizationId) { if (error) setLoading(false); return; }
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ organizationId }); if (status) params.set('status', status);
    fetch(`/api/documents?${params}`, { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload; }).then(async (payload) => { if (!active) return; const list = payload.data ?? []; setDocuments(list); const ids = [...new Set(list.map((item: Document) => item.candidate_id))]; const names = await Promise.all(ids.map(async (id) => { const response = await fetch(`/api/candidates/${id}?organizationId=${organizationId}`, { cache: 'no-store' }); const result = await response.json(); return [id, result.data?.full_name ?? 'Candidato não identificado']; })); if (active) setCandidateNames(Object.fromEntries(names)); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os documentos.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, status, error]);

  async function viewDocument(id: string) { if (!organizationId) return; setViewing(id); try { const response = await fetch(`/api/documents/${id}?organizationId=${organizationId}`, { cache: 'no-store' }); const payload = await response.json(); if (!response.ok || !payload.signedUrl) { setError(payload.error || 'Não foi possível visualizar o documento.'); return; } window.open(payload.signedUrl, '_blank', 'noopener,noreferrer'); } catch { setError('Não foi possível visualizar o documento.'); } finally { setViewing(''); } }

  return <div><div className="page-heading"><div><p className="eyebrow">Pendências e arquivos</p><h1>Documentos</h1><p>Arquivos privados, revisão clara e nenhum download sem contexto.</p></div></div>{error && <div className="form-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}<div className="screen-toolbar"><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar documentos por status"><option value="">Todos os status</option><option value="pending">Pendente</option><option value="uploaded">Enviado</option><option value="in_review">Em análise</option><option value="approved">Aprovado</option><option value="rejected">Reprovado</option><option value="request_again">Solicitar novamente</option></select><span className="muted">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span></div><section className="panel table-panel">{loading ? <div className="loading-state">Carregando documentos</div> : documents.length === 0 ? <div className="empty-state"><strong>Nenhum documento encontrado</strong><p>{status ? 'Não há documentos com este status.' : 'Os documentos enviados pelos candidatos aparecerão aqui.'}</p></div> : <table className="data-table"><thead><tr><th>Documento</th><th>Candidato</th><th>Status</th><th>Enviado em</th><th /></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td><span className="candidate-cell"><strong>{document.original_name || formatDocumentType(document.document_type)}</strong><span>{formatDocumentType(document.document_type)}{document.size_bytes ? ` · ${formatBytes(document.size_bytes)}` : ''}</span></span></td><td><Link className="text-link" href={`/candidatos/${document.candidate_id}?tab=documents`}>{candidateNames[document.candidate_id] ?? 'Carregando…'}<Icon name="chevron-right" size={14} /></Link></td><td><StatusBadge status={document.status} /></td><td className="muted">{formatDate(document.created_at)}</td><td><button className="button button-ghost" onClick={() => viewDocument(document.id)} disabled={viewing === document.id}>{viewing === document.id ? 'Abrindo…' : 'Visualizar'}<Icon name="arrow-up-right" size={14} /></button></td></tr>)}</tbody></table>}</section></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function formatDocumentType(value: string) { return ({ proof_of_address: 'Comprovante de residência', work_card: 'Carteira de trabalho', resume: 'Currículo', certificate: 'Certificado' } as Record<string, string>)[value] ?? value.toUpperCase(); }
