'use client';

import { createClient } from '@/lib/supabase/client';
import { OrganizationOnboarding } from '@/components/organization/organization-onboarding';
import { ProfileOnboarding } from '@/components/auth/profile-onboarding';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type MeResponse = {
  data?: {
    user: { id: string; email: string | null };
    profile: Profile | null;
    membership: { role: string } | null;
    organization: { id: string; name: string } | null;
  };
};

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/candidatos', label: 'Candidatos', icon: 'users' },
  { href: '/processos', label: 'Processos', icon: 'git-branch' },
  { href: '/documentos', label: 'Documentos', icon: 'file-check' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<MeResponse['data'] | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: MeResponse) => {
        if (active && payload.data) {
          setMe(payload.data);
        }
      })
      .catch(() => undefined)
      .finally(() => setMeLoaded(true));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const profile = (event as CustomEvent<Profile>).detail;
      if (profile) {
        setMe((current) => current ? { ...current, profile } : current);
      }
    }

    window.addEventListener('profile:updated', handleProfileUpdated);
    return () => window.removeEventListener('profile:updated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const displayName = me?.profile?.full_name || '';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/candidatos?q=${encodeURIComponent(query)}` : '/candidatos');
  }

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <div className="app-frame">
      <div className={`mobile-scrim ${mobileOpen ? 'is-visible' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark brand-mark-logo"><img src="/logo.svg" alt="" /></div>
          <div>
            <strong>Vieira Couto</strong>
            <span>RH operacional</span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
            <Icon name="x" />
          </button>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link className={`sidebar-link ${active ? 'is-active' : ''}`} href={item.href} key={item.href}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section-label sidebar-lower-label">Administração</div>
        <nav className="sidebar-nav" aria-label="Administração">
          <Link className={`sidebar-link ${pathname.startsWith('/configuracoes') ? 'is-active' : ''}`} href="/configuracoes">
            <Icon name="settings" />
            <span>Configurações</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          {meLoaded && me?.profile ? (
            <div className="user-chip">
              <Link className="user-chip-profile" href="/perfil" aria-label="Abrir meu perfil">
                <div className="avatar avatar-small">{initials || 'RH'}</div>
            <div className="user-chip-copy">
              <strong>{displayName}</strong>
                  <span>{!me.organization ? 'Organização pendente' : me.membership?.role === 'admin' ? 'Administrador' : 'Equipe RH'}</span>
                </div>
              </Link>
              <button className="icon-button" onClick={signOut} aria-label="Sair">
                <Icon name="log-out" size={16} />
              </button>
            </div>
          ) : meLoaded && me ? (
            <div className="sidebar-session-note">
              <Link className="sidebar-session-link" href="/perfil" aria-label="Abrir meu perfil">
                <div className="avatar avatar-small avatar-muted"><Icon name="user" size={16} /></div>
                <div className="user-chip-copy">
                  <strong>Perfil pendente</strong>
                  <span>Complete seu acesso</span>
                </div>
              </Link>
              <button className="icon-button" onClick={signOut} aria-label="Sair">
                <Icon name="log-out" size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" />
          </button>
          <form className="global-search" onSubmit={submitSearch}>
            <Icon name="search" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar candidato por nome, CPF ou telefone" aria-label="Buscar candidato" />
            <kbd>⌘ K</kbd>
          </form>
          <div className="header-actions">
            <button className="icon-button header-icon-button" aria-label="Notificações">
              <Icon name="bell" />
              <span className="notification-dot" />
            </button>
          </div>
        </header>
        <main className="app-main">
          {meLoaded && me && !me.profile ? (
            <ProfileOnboarding
              email={me.user.email}
              onCompleted={(profile) => setMe((current) => current ? { ...current, profile } : current)}
            />
          ) : meLoaded && me?.profile && !me.organization ? (
            <OrganizationOnboarding
              email={me.user.email}
              onCompleted={({ organization, membership }) => setMe((current) => current ? { ...current, organization, membership } : current)}
            />
          ) : children}
        </main>
      </div>
    </div>
  );
}
