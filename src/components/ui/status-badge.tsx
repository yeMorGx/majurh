import { Icon, type IconName } from '@/components/ui/icon';

const statusLabels: Record<string, string> = {
  new: 'Novo candidato',
  screening: 'Triagem',
  interview: 'Entrevista',
  evaluation: 'Avaliação',
  approved: 'Aprovado',
  documentation: 'Documentação',
  admission: 'Admissão',
  hired: 'Contratado',
  rejected: 'Reprovado',
  withdrawn: 'Desistiu',
  talent_pool: 'Banco de talentos',
  pending: 'Pendente',
  uploaded: 'Enviado',
  in_review: 'Em análise',
  request_again: 'Solicitar novamente',
};

const statusIcons: Record<string, IconName> = {
  new: 'file-text',
  screening: 'search',
  interview: 'users',
  evaluation: 'activity',
  approved: 'check-circle',
  documentation: 'file-check',
  admission: 'briefcase',
  hired: 'check-circle',
  rejected: 'x',
  withdrawn: 'x',
  talent_pool: 'file-text',
  pending: 'clock',
  uploaded: 'file-check',
  in_review: 'activity',
  request_again: 'clock',
};

export function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status.replace('_', '-');
  return (
    <span className={`status-badge status-${tone}`}>
      <Icon name={statusIcons[status] ?? 'activity'} size={14} />
      <span>{statusLabel(status)}</span>
    </span>
  );
}
