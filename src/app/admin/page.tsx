import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL;
  redirect(adminUrl || '/dashboard?notice=admin-moved');
}
