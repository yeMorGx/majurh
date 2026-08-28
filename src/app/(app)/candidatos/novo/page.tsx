import { NewCandidateForm } from '@/components/candidates/new-candidate-form';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export default function NewCandidatePage() {
  return <div><div className="page-heading"><div><Link href="/candidatos" className="text-link" style={{ marginBottom: 12 }}><Icon name="arrow-left" size={15} />Voltar para candidatos</Link><p className="eyebrow">Nova ficha</p><h1>Adicionar candidato</h1><p>Crie a ficha permanente. O primeiro processo pode ser incluído depois, sem duplicar o histórico.</p></div></div><NewCandidateForm /></div>;
}
