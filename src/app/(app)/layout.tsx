import { AppShell } from '@/components/layout/app-shell';
import './workspace.css';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
