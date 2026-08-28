import { CandidateDetailClient } from '@/components/candidates/candidate-detail-client';

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CandidateDetailClient candidateId={id} />;
}
