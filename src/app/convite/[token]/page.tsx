import { InvitationClient } from '@/components/auth/invitation-client';

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationClient token={token} />;
}
