import { redirect } from 'next/navigation';

export default function AdministrationPage() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL;
  redirect(adminUrl || '/dashboard?notice=admin-moved');
}
