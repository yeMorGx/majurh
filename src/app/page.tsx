import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const requestHeaders = await headers();
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect('/login');
  }

  redirect(requestHeaders.get('host')?.split(':')[0].toLowerCase().startsWith('admin.') ? '/admin' : '/dashboard');
}
