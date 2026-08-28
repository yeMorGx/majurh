'use client';

import { Icon } from '@/components/ui/icon';
import { StatusBadge, statusLabel } from '@/components/ui/status-badge';
import { NewProcessForm } from '@/components/processes/new-process-form';
import { processStatuses } from '@/lib/processes/constants';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Candidate = { id: string; full_name: string; cpf: string; rg: string | null; birth_date: string | null; phone: string | null; email: string | null; city: string | null; state: string | null; street: string | null; address_number: string | null; notes: string | null; updated_at: string };
type Process = { id: string; candidate_id: string; vacancy_id: string | null; status: string; started_at: string; finished_at: string | null; withdrawal_reason_code: string | null; withdrawal_notes: string | null; can_apply_again: string | null; updated_at: string };
type Document = { id: string; candidate_id: string; process_id: string | null; document_type: string; status: string; original_name: string | null; mime_type: string | null; size_bytes: number | null; created_at: string };
type History = { id: string; process_id: string; action: string; old_status: string | null; new_status: string | null; notes: string | null; created_at: string };
type WithdrawalDraft = { process: Process; reason: string; notes: string; canApplyAgain: string };

const tabs = [{ id: 'overview', label: 'Visão geral' }, { id: 'documents', label: 'Documentos' }, { id: 'processes', label: 'Processos' }, { id: 'history', label: 'Histórico' }];

export function CandidateDetailClient({ candidateId }: { candidateId: string }) {
  const [organizationId, setOrganizationId] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadType, setUploadType] = useState('resume');
  const [uploadProcess, setUploadProcess] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [withdrawalDraft, setWithdrawalDraft] = useState<WithdrawalDraft | null>(null);
  const [withdrawalSaving, setWithdrawalSaving] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab && tabs.some((item) => item.id === requestedTab)) setTab(requestedTab);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok || !mePayload.data?.organization?.id) throw new Error(mePayload.error || 'Seu usuário não está associado a uma organização.');
        const organization = mePayload.data.organization.id;
        const params = `organizationId=${organization}`;
        const [candidateResponse, processResponse, documentResponse] = await Promise.all([
          fetch(`/api/candidates/${candidateId}?${params}`, { cache: 'no-store' }),
          fetch(`/api/processes?${params}&candidateId=${candidateId}&pageSize=100`, { cache: 'no-store' }),
          fetch(`/api/documents?${params}&candidateId=${candidateId}`, { cache: 'no-store' }),
        ]);
        const [candidatePayload, processPayload, documentPayload] = await Promise.all([candidateResponse.json(), processResponse.json(), documentResponse.json()]);
        if (!candidateResponse.ok) throw new Error(candidatePayload.error || 'Candidato não encontrado.');
        if (!active) return;
        setOrganizationId(organization); setCandidate(candidatePayload.data); setProcesses(processPayload.data ?? []); setDocuments(documentPayload.data ?? []);
        const firstProcess = processPayload.data?.[0];
        if (firstProcess) {
          const historyResponse = await fetch(`/api/processes/${firstProcess.id}/history?${params}`, { cache: 'no-store' });
          const historyPayload = await historyResponse.json();
          if (active && historyResponse.ok) setHistory(historyPayload.data ?? []);
        }
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o candidato.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [candidateId]);

  const currentProcess = processes[0] ?? null;
  const initials = candidate?.full_name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? 'VC';

  async function updateProcessStatus(process: Process, nextStatus: string) {
    if (!organizationId || nextStatus === process.status) return;
    if (nextStatus === 'withdrawn') {
      setError('');
      setWithdrawalDraft({ process, reason: 'no_reason_informed', notes: '', canApplyAgain: 'review' });
      return;
    }

    await persistProcessStatus(process, nextStatus);
  }

  async function persistProcessStatus(process: Process, nextStatus: string, details?: Pick<WithdrawalDraft, 'reason' | 'notes' | 'canApplyAgain'>) {
    const body: Record<string, string> = { status: nextStatus };
    if (details) {
      body.withdrawal_reason_code = details.reason;
      body.withdrawal_notes = details.notes;
      body.can_apply_again = details.canApplyAgain;
    }

    const response = await fetch(`/api/processes/${process.id}?organizationId=${organizationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || 'Não foi possível atualizar o processo.'); return false; }
    setProcesses((current) => current.map((item) => item.id === process.id ? { ...item, ...payload.data } : item));
    setError('');
    return true;
  }

  async function confirmWithdrawal() {
    if (!withdrawalDraft) return;
    if (!withdrawalDraft.reason) {
      setError('Escolha um motivo para registrar a desistência.');
      return;
    }

    setWithdrawalSaving(true);
    const saved = await persistProcessStatus(withdrawalDraft.process, 'withdrawn', withdrawalDraft);
    if (saved) setWithdrawalDraft(null);
    setWithdrawalSaving(false);
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !uploadFile) { setUploadMessage('Escolha um arquivo antes de enviar.'); return; }
    setUploading(true); setUploadMessage('');
    try {
      const formData = new FormData();
      formData.set('organizationId', organizationId); formData.set('candidate_id', candidateId); formData.set('document_type', uploadType); formData.set('file', uploadFile);
      if (uploadProcess) formData.set('process_id', uploadProcess);
      const response = await fetch('/api/documents', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) { setUploadMessage(payload.error || 'Não foi possível enviar o documento.'); return; }
      setDocuments((current) => [payload.data, ...current]); setUploadFile(null); setUploadMessage('Documento enviado.');
      const input = document.getElementById('candidate-file') as HTMLInputElement | null; if (input) input.value = '';
    } catch { setUploadMessage('Não foi possível enviar o documento. Tente novamente.'); }
    finally { setUploading(false); }
  }

  async function saveCandidate(updates: Partial<Candidate>) {
    const response = await fetch(`/api/candidates/${candidateId}?organizationId=${organizationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.fields?.join(' ') || payload.error || 'Não foi possível atualizar o candidato.');
    setCandidate((current) => current ? { ...current, ...payload.data } : current);
    setEditing(false);
  }

  async function reviewDocument(documentId: string, status: string) {
    const response = await fetch(`/api/documents/${documentId}?organizationId=${organizationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const payload = await response.json();
    if (!response.ok) { setUploadMessage(payload.error || 'Não foi possível revisar o documento.'); return; }
    setDocuments((current) => current.map((item) => item.id === documentId ? { ...item, ...payload.data } : item));
  }

  if (loading) return <div className="loading-state">Carregando ficha do candidato</div>;
  if (error && !candidate) return <div className="setup-callout"><h2>Não foi possível abrir o candidato</h2><p>{error}</p><Link className="button button-secondary" href="/candidatos" style={{ marginTop: 16 }}>Voltar para candidatos</Link></div>;
  if (!candidate) return null;

  return <div><Link href="/candidatos" className="text-link" style={{ marginBottom: 16 }}><Icon name="arrow-left" size={15} />Voltar para candidatos</Link><section className="profile-card profile-hero"><div className="profile-identity"><div className="profile-avatar">{initials}</div><div><h1>{candidate.full_name}</h1><div className="profile-meta"><span className="mono">CPF {maskCpf(candidate.cpf)}</span>{candidate.phone && <span>{candidate.phone}</span>}{currentProcess && <StatusBadge status={currentProcess.status} />}</div></div></div><div className="profile-actions"><button className="button button-secondary" onClick={() => setEditing((current) => !current)}><Icon name="user" size={16} />{editing ? 'Fechar edição' : 'Editar candidato'}</button><button className="button button-primary" onClick={() => setTab('documents')}><Icon name="upload" size={16} />Adicionar documento</button></div></section>{editing && <EditCandidatePanel candidate={candidate} onSave={saveCandidate} onCancel={() => setEditing(false)} />}<div className="tabs" role="tablist">{tabs.map((item) => <button className={`tab ${tab === item.id ? 'is-active' : ''}`} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} key={item.id}>{item.label}</button>)}</div>{error && <div className="form-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}{tab === 'overview' && <OverviewTab candidate={candidate} process={currentProcess} />}{tab === 'processes' && <ProcessesTab organizationId={organizationId} candidateId={candidate.id} processes={processes} onCreated={(process) => setProcesses((current) => [process, ...current])} onStatusChange={updateProcessStatus} />}{tab === 'documents' && <DocumentsTab documents={documents} processes={processes} uploadType={uploadType} setUploadType={setUploadType} uploadProcess={uploadProcess} setUploadProcess={setUploadProcess} uploadFile={uploadFile} setUploadFile={setUploadFile} uploading={uploading} message={uploadMessage} onUpload={uploadDocument} onReview={reviewDocument} />}{tab === 'history' && <HistoryTab history={history} />}{withdrawalDraft && <WithdrawalDialog draft={withdrawalDraft} onChange={setWithdrawalDraft} onCancel={() => setWithdrawalDraft(null)} onConfirm={confirmWithdrawal} saving={withdrawalSaving} />}</div>;
}

function WithdrawalDialog({ draft, onChange, onCancel, onConfirm, saving }: { draft: WithdrawalDraft; onChange: (draft: WithdrawalDraft) => void; onCancel: () => void; onConfirm: () => void; saving: boolean }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title"><div className="modal-header"><div><p className="eyebrow">Registro do processo</p><h2 id="withdrawal-title">Registrar desistência</h2><p>Esse motivo fica no histórico desta participação, sem alterar a ficha permanente.</p></div><button className="icon-button" onClick={onCancel} aria-label="Fechar diálogo"><Icon name="x" size={17} /></button></div><div className="modal-fields"><div className="field"><label htmlFor="withdrawal-reason">Motivo da desistência</label><select className="form-select" id="withdrawal-reason" value={draft.reason} onChange={(event) => onChange({ ...draft, reason: event.target.value })}><option value="">Selecione um motivo</option><option value="other_offer">Outra proposta</option><option value="salary">Salário</option><option value="schedule">Horário</option><option value="location">Localização</option><option value="benefits">Benefícios</option><option value="personal">Problemas pessoais</option><option value="no_response">Não respondeu</option><option value="no_reason_informed">Sem motivo informado</option><option value="other">Outro</option></select></div><div className="field"><label htmlFor="withdrawal-notes">Observação <span className="muted">(opcional)</span></label><textarea className="form-textarea" id="withdrawal-notes" value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} placeholder="Ex.: aceitou uma oportunidade mais próxima de casa" /></div><div className="field"><label htmlFor="withdrawal-reapply">Pode participar novamente?</label><select className="form-select" id="withdrawal-reapply" value={draft.canApplyAgain} onChange={(event) => onChange({ ...draft, canApplyAgain: event.target.value })}><option value="yes">Sim</option><option value="no">Não</option><option value="review">Avaliar antes</option></select></div></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button><button type="button" className="button button-primary" onClick={onConfirm} disabled={saving}>{saving ? 'Registrando…' : 'Registrar desistência'}<Icon name="check" size={16} /></button></div></section></div>;
}

function OverviewTab({ candidate, process }: { candidate: Candidate; process: Process | null }) {
  return <div className="detail-grid"><section className="panel"><div className="panel-header"><div><h2>Dados da ficha</h2><p>Informações principais de contato</p></div></div><dl className="detail-list"><div><dt>Nome completo</dt><dd>{candidate.full_name}</dd></div><div><dt>CPF</dt><dd className="mono">{maskCpf(candidate.cpf)}</dd></div><div><dt>RG</dt><dd>{candidate.rg || 'Não informado'}</dd></div><div><dt>Nascimento</dt><dd>{candidate.birth_date ? formatDate(candidate.birth_date) : 'Não informado'}</dd></div><div><dt>Telefone</dt><dd>{candidate.phone || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{candidate.email || 'Não informado'}</dd></div><div><dt>Localidade</dt><dd>{candidate.city ? `${candidate.city}${candidate.state ? ` · ${candidate.state}` : ''}` : 'Não informado'}</dd></div><div><dt>Endereço</dt><dd>{candidate.street ? `${candidate.street}${candidate.address_number ? `, ${candidate.address_number}` : ''}` : 'Não informado'}</dd></div></dl>{candidate.notes && <div style={{ marginTop: 22 }}><dt className="muted" style={{ fontSize: 11 }}>Notas internas</dt><p style={{ margin: '4px 0 0' }}>{candidate.notes}</p></div>}</section><section className="panel"><div className="panel-header"><div><h2>Trilha do processo</h2><p>{process ? 'Etapa atual deste candidato' : 'Nenhum processo criado ainda'}</p></div>{process && <StatusBadge status={process.status} />}</div>{process ? <ProcessTimeline status={process.status} /> : <div className="empty-state"><strong>Comece um processo</strong><p>Adicione este candidato a uma vaga para acompanhar as etapas.</p></div>}</section></div>;
}

function ProcessesTab({ organizationId, candidateId, processes, onCreated, onStatusChange }: { organizationId: string; candidateId: string; processes: Process[]; onCreated: (process: Process) => void; onStatusChange: (process: Process, status: string) => void }) {
  const [creating, setCreating] = useState(false);
  return <section className="panel"><div className="panel-header"><div><h2>Participações no processo seletivo</h2><p>O histórico permanece separado por vaga e tentativa.</p></div><button className="button button-secondary" onClick={() => setCreating((current) => !current)}><Icon name="plus" size={15} />Novo processo</button></div>{creating && <NewProcessForm organizationId={organizationId} candidateId={candidateId} onCreated={(process) => { onCreated(process); setCreating(false); }} onCancel={() => setCreating(false)} />}{processes.length === 0 ? <div className="empty-state"><strong>Nenhum processo ainda</strong><p>O candidato ainda não foi associado a uma vaga.</p></div> : <div className="mini-list">{processes.map((process) => <div className="mini-list-item" key={process.id}><span className="mini-list-icon"><Icon name="git-branch" size={16} /></span><span className="mini-list-copy"><strong><StatusBadge status={process.status} /></strong><span>Iniciado em {formatDate(process.started_at)} · processo {process.id.slice(0, 8)}</span></span><select className="filter-select" value={process.status} onChange={(event) => onStatusChange(process, event.target.value)} aria-label="Atualizar status do processo">{processStatuses.map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></div>)}</div>}</section>;
}

function DocumentsTab({ documents, processes, uploadType, setUploadType, uploadProcess, setUploadProcess, uploadFile, setUploadFile, uploading, message, onUpload, onReview }: { documents: Document[]; processes: Process[]; uploadType: string; setUploadType: (value: string) => void; uploadProcess: string; setUploadProcess: (value: string) => void; uploadFile: File | null; setUploadFile: (value: File | null) => void; uploading: boolean; message: string; onUpload: (event: React.FormEvent<HTMLFormElement>) => void; onReview: (documentId: string, status: string) => void }) {
  return <div><section className="panel"><div className="panel-header"><div><h2>Enviar documento</h2><p>PDF, JPG ou PNG · até 6 MB · bucket privado</p></div></div><form className="upload-box" onSubmit={onUpload}><div className="field"><label htmlFor="document-type">Tipo de documento</label><select className="form-select" id="document-type" value={uploadType} onChange={(event) => setUploadType(event.target.value)}><option value="resume">Currículo</option><option value="rg">RG</option><option value="cpf">CPF</option><option value="cnh">CNH</option><option value="proof_of_address">Comprovante de residência</option><option value="work_card">Carteira de trabalho</option><option value="certificate">Certificado</option><option value="other">Outro</option></select></div><div className="field"><label htmlFor="document-process">Vincular ao processo</label><select className="form-select" id="document-process" value={uploadProcess} onChange={(event) => setUploadProcess(event.target.value)}><option value="">Ficha geral</option>{processes.map((process) => <option value={process.id} key={process.id}>Processo {process.id.slice(0, 8)} · {statusLabel(process.status)}</option>)}</select></div><div className="field"><label htmlFor="candidate-file">Arquivo</label><input className="file-input" id="candidate-file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /></div><button className="button button-primary" disabled={uploading}>{uploading ? 'Enviando…' : 'Enviar'}<Icon name="upload" size={16} /></button></form>{message && <div className={message === 'Documento enviado.' ? 'form-success' : 'form-error'} role="status">{message}</div>}</section><section className="panel" style={{ marginTop: 16 }}><div className="panel-header"><div><h2>Documentos da ficha</h2><p>{documents.length} {documents.length === 1 ? 'arquivo registrado' : 'arquivos registrados'}</p></div></div>{documents.length === 0 ? <div className="empty-state"><strong>Nenhum documento enviado</strong><p>Comece anexando o currículo ou o primeiro documento necessário.</p></div> : <div>{documents.map((document) => <div className="document-row" key={document.id}><span className="document-icon"><Icon name="file-text" size={18} /></span><span className="document-copy"><strong>{document.original_name || formatDocumentType(document.document_type)}</strong><span>{formatDocumentType(document.document_type)} · {document.size_bytes ? formatBytes(document.size_bytes) : 'Tamanho não informado'} · {formatDate(document.created_at)}</span></span><select className="filter-select document-review-select" value={document.status} onChange={(event) => onReview(document.id, event.target.value)} aria-label={`Revisar ${document.original_name || formatDocumentType(document.document_type)}`}>{['pending', 'uploaded', 'in_review', 'approved', 'rejected', 'request_again'].map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></div>)}</div>}</section></div>;
}

function HistoryTab({ history }: { history: History[] }) { return <section className="panel"><div className="panel-header"><div><h2>Histórico de atividade</h2><p>Alterações registradas automaticamente pelo processo.</p></div></div>{history.length === 0 ? <div className="empty-state"><strong>Sem histórico ainda</strong><p>As mudanças de status aparecerão nesta linha do tempo.</p></div> : <div className="activity-list">{history.map((item) => <div className="activity-item" key={item.id}><div><strong>{item.new_status ? `${item.old_status ? statusLabel(item.old_status) : 'Processo'} → ${statusLabel(item.new_status)}` : 'Processo criado'}</strong><span>{formatDate(item.created_at)} · {item.action === 'process_created' ? 'criação' : 'mudança de status'}</span></div></div>)}</div>}</section>; }
function EditCandidatePanel({ candidate, onSave, onCancel }: { candidate: Candidate; onSave: (updates: Partial<Candidate>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({ full_name: candidate.full_name, phone: candidate.phone ?? '', email: candidate.email ?? '', city: candidate.city ?? '', state: candidate.state ?? '', notes: candidate.notes ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(''); try { await onSave(form); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar.'); } finally { setSaving(false); } }
  return <form className="inline-form-card" onSubmit={submit}><div className="inline-form-heading"><div><strong>Editar dados da ficha</strong><span>O CPF permanece protegido e não pode ser alterado aqui.</span></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Fechar edição"><Icon name="x" size={16} /></button></div><div className="form-grid"><div className="field field-full"><label htmlFor="edit-full-name">Nome completo</label><input className="form-input" id="edit-full-name" required value={form.full_name} onChange={(event) => update('full_name', event.target.value)} /></div><div className="field"><label htmlFor="edit-phone">Telefone</label><input className="form-input" id="edit-phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></div><div className="field"><label htmlFor="edit-email">E-mail</label><input className="form-input" id="edit-email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></div><div className="field"><label htmlFor="edit-city">Cidade</label><input className="form-input" id="edit-city" value={form.city} onChange={(event) => update('city', event.target.value)} /></div><div className="field"><label htmlFor="edit-state">Estado</label><input className="form-input" id="edit-state" maxLength={2} value={form.state} onChange={(event) => update('state', event.target.value.toUpperCase())} /></div><div className="field field-full"><label htmlFor="edit-notes">Notas internas</label><textarea className="form-textarea" id="edit-notes" value={form.notes} onChange={(event) => update('notes', event.target.value)} /></div></div>{error && <div className="form-error" role="alert" style={{ marginTop: 14 }}>{error}</div>}<div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}<Icon name="check" size={16} /></button></div></form>;
}
function ProcessTimeline({ status }: { status: string }) { const currentIndex = processStatuses.indexOf(status as (typeof processStatuses)[number]); return <div className="timeline">{processStatuses.slice(0, 9).map((item, index) => <div className={`timeline-item ${index < currentIndex ? 'is-complete' : ''} ${index === currentIndex ? 'is-current' : ''} ${index > currentIndex ? 'is-pending' : ''}`} key={item}><span className="timeline-dot">{index <= currentIndex && <Icon name="check" size={11} strokeWidth={2.4} />}</span><span className="timeline-copy"><strong>{statusLabel(item)}</strong><span>{index === currentIndex ? 'Etapa atual' : index < currentIndex ? 'Concluída' : 'Próxima etapa'}</span></span></div>)}</div>; }
function maskCpf(value: string) { const numbers = value.replace(/\D/g, ''); return numbers.length === 11 ? `***.***.${numbers.slice(6, 9)}-${numbers.slice(9)}` : '***'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function formatDocumentType(value: string) { return ({ proof_of_address: 'Comprovante de residência', work_card: 'Carteira de trabalho', resume: 'Currículo', certificate: 'Certificado' } as Record<string, string>)[value] ?? value.toUpperCase(); }
