'use client';

import { Icon } from '@/components/ui/icon';
import { StatusBadge, statusLabel } from '@/components/ui/status-badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type DashboardData = {
  metrics: { activeProcesses: number; interviews: number; pendingDocuments: number; hiredThisMonth: number };
  recentProcesses: Array<{ id: string; candidate_id: string; candidate_name: string; vacancy_title: string; status: string; updated_at: string }>;
  pendingDocuments: Array<{ id: string; candidate_id: string; candidate_name: string; document_type: string; status: string; created_at: string }>;
  activity: Array<{ id: string; candidate_name: string; action: string; old_status: string | null; new_status: string | null; created_at: string }>;
};

type MeData = { profile: { full_name: string } | null; organization: { id: string; name: string } | null };

export function DashboardClient() {
  const [me, setMe] = useState<MeData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store' });
        const mePayload = await meResponse.json();
        if (!meResponse.ok) throw new Error(mePayload.error || 'Não foi possível carregar seu acesso.');
        if (!active) return;
        setMe(mePayload.data);
        if (!mePayload.data.organization) return;
        const dashboardResponse = await fetch(`/api/dashboard?organizationId=${mePayload.data.organization.id}`, { cache: 'no-store' });
        const dashboardPayload = await dashboardResponse.json();
        if (!dashboardResponse.ok) throw new Error(dashboardPayload.error || 'Não foi possível carregar o dashboard.');
        if (active) setDashboard(dashboardPayload.data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="loading-state">Carregando seu posto de controle</div>;
  if (error) return <div className="setup-callout"><h2>Não foi possível carregar o dashboard</h2><p>{error}</p></div>;
  if (!me?.organization) return <SetupState />;

  const firstName = me.profile?.full_name?.split(' ')[0] || 'equipe';
  const data = dashboard ?? { metrics: { activeProcesses: 0, interviews: 0, pendingDocuments: 0, hiredThisMonth: 0 }, recentProcesses: [], pendingDocuments: [], activity: [] };

  return (
    <div>
      <div className="page-heading">
        <div><p className="eyebrow">Visão operacional</p><h1>Bom dia, {firstName}</h1><p>Acompanhe o próximo passo de cada candidato sem perder o histórico.</p></div>
        <div className="heading-actions"><Link href="/candidatos/novo" className="button button-primary"><Icon name="plus" size={17} />Adicionar candidato</Link></div>
      </div>

      <section className="metric-grid" aria-label="Indicadores do RH">
        <MetricCard featured label="Processos ativos" value={data.metrics.activeProcesses} note="Candidatos em andamento" href="/processos" />
        <MetricCard label="Em entrevista" value={data.metrics.interviews} note="Próxima etapa" href="/processos?status=interview" />
        <MetricCard label="Aguardando documentos" value={data.metrics.pendingDocuments} note="Pendências para revisar" href="/documentos?status=pending" />
        <MetricCard label="Contratados no mês" value={data.metrics.hiredThisMonth} note="Desde o primeiro dia do mês" href="/processos?status=hired" />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <PanelHeader title="Processos recentes" subtitle="O que mudou por último" linkHref="/processos" linkLabel="Ver todos" />
          {data.recentProcesses.length === 0 ? <EmptyState title="Ainda não há processos" text="Quando um candidato entrar em uma vaga, ele aparecerá aqui." /> : <table className="process-table"><thead><tr><th>Candidato</th><th>Vaga</th><th>Status</th><th>Atualizado</th></tr></thead><tbody>{data.recentProcesses.map((process) => <tr key={process.id}><td><Link href={`/candidatos/${process.candidate_id}`} className="candidate-cell"><strong>{process.candidate_name}</strong><span className="mono">processo {process.id.slice(0, 8)}</span></Link></td><td className="muted">{process.vacancy_title}</td><td><StatusBadge status={process.status} /></td><td className="muted">{formatDate(process.updated_at)}</td></tr>)}</tbody></table>}
        </section>
        <div className="dashboard-side">
          <section className="panel"><PanelHeader title="Documentos pendentes" subtitle="O próximo cuidado do RH" linkHref="/documentos" linkLabel="Abrir lista" />{data.pendingDocuments.length === 0 ? <EmptyState title="Tudo em dia" text="Nenhum documento aguardando revisão." /> : <div className="mini-list">{data.pendingDocuments.slice(0, 4).map((document) => <Link className="mini-list-item" href={`/candidatos/${document.candidate_id}?tab=documents`} key={document.id}><span className="mini-list-icon"><Icon name="file-check" size={16} /></span><span className="mini-list-copy"><strong>{document.candidate_name}</strong><span>{formatDocumentType(document.document_type)} · {statusLabel(document.status)}</span></span><Icon name="chevron-right" size={15} /></Link>)}</div>}</section>
          <section className="panel"><PanelHeader title="Atividade recente" subtitle="Histórico do processo" />{data.activity.length === 0 ? <EmptyState title="Sem atividade ainda" text="As mudanças de etapa serão registradas aqui." /> : <div className="activity-list">{data.activity.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><div><strong>{activityCopy(item, item.candidate_name)}</strong><span>{formatDate(item.created_at)}</span></div></div>)}</div>}</section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, href, featured = false }: { label: string; value: number; note: string; href: string; featured?: boolean }) {
  return <Link href={href} className={`metric-card ${featured ? 'metric-card-featured' : ''}`}><div className="metric-label"><span>{label}</span><Icon name="arrow-up-right" size={16} /></div><div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div></Link>;
}

function PanelHeader({ title, subtitle, linkHref, linkLabel }: { title: string; subtitle?: string; linkHref?: string; linkLabel?: string }) {
  return <div className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{linkHref && linkLabel && <Link href={linkHref} className="text-link">{linkLabel}<Icon name="arrow-up-right" size={14} /></Link>}</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><strong>{title}</strong><p>{text}</p></div>; }
function SetupState() { return <div className="setup-callout"><h2>Configure sua organização para começar</h2><p>Crie o espaço do seu RH para organizar candidatos, processos e documentos.</p><Link className="button button-primary" href="/configuracoes">Continuar configuração <Icon name="arrow-up-right" size={15} /></Link></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)); }
function formatDocumentType(value: string) { return ({ proof_of_address: 'Comprovante de residência', work_card: 'Carteira de trabalho', resume: 'Currículo', certificate: 'Certificado' } as Record<string, string>)[value] ?? value.toUpperCase(); }
function activityCopy(item: DashboardData['activity'][number], name: string) { if (item.action === 'process_created') return `${name} entrou em um processo`; if (item.new_status) return `${name} mudou para ${statusLabel(item.new_status)}`; return `${name} teve uma atualização`; }
