'use client';

import { authClient } from '@/lib/auth/client';
import { OrganizationOnboarding } from '@/components/organization/organization-onboarding';
import { ProfileOnboarding } from '@/components/auth/profile-onboarding';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { getBrandStyle, getOrganizationAssetUrl, platformBrand, type OrganizationBrand } from '@/lib/branding';
import { PresenceHeartbeat } from '@/components/presence/presence-heartbeat';
import { TimeTrackerProvider } from '@/components/productivity/time-tracker-provider';
import { AnimatedGearIcon } from '@/components/ui/animated-gear';
import { NotificationCenter } from '@/components/notifications/notification-center';

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
    organization: OrganizationBrand | null;
  };
};
type MeData = NonNullable<MeResponse['data']>;

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/candidatos', label: 'Candidatos', icon: 'users' },
  { href: '/processos', label: 'Processos', icon: 'git-branch' },
  { href: '/vagas', label: 'Vagas', icon: 'briefcase' },
  { href: '/documentos', label: 'Documentos', icon: 'file-check' },
  { href: '/produtividade', label: 'Produtividade', icon: 'kanban' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return <TimeTrackerProvider><AppShellContent>{children}</AppShellContent></TimeTrackerProvider>;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    async function refreshMe() {
      try {
        const response = await fetch('/api/me', { cache: 'no-store' });
        const payload = await response.json() as MeResponse;
        const next = payload.data;
        if (active && next) {
          setMe((current) => sameMeData(current, next) ? current : next);
        }
      } catch {
        // A falha momentânea não derruba a sessão já carregada.
      } finally {
        if (active) setMeLoaded(true);
      }
    }

    void refreshMe();
    const refreshTimer = window.setInterval(() => void refreshMe(), 5000);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('majurh:organization-updated');
      channel.onmessage = (event: MessageEvent<OrganizationBrand>) => {
        if (!event.data?.id) return;
        setMe((current) => current ? { ...current, organization: event.data } : current);
      };
    }

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      channel?.close();
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
    function handleOrganizationUpdated(event: Event) {
      const organization = (event as CustomEvent<OrganizationBrand>).detail;
      if (organization) {
        setMe((current) => current ? { ...current, organization } : current);
      }
    }

    window.addEventListener('organization:updated', handleOrganizationUpdated);
    return () => window.removeEventListener('organization:updated', handleOrganizationUpdated);
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
  const brandName = me?.organization?.name || platformBrand.name;
  const brandDescriptor = me?.organization ? `Powered by ${platformBrand.name}` : platformBrand.descriptor;
  const brandLogo = getOrganizationAssetUrl(me?.organization, 'logo') || platformBrand.logoPath;
  const brandStyle = getBrandStyle(me?.organization);

  useEffect(() => {
    document.title = brandName === platformBrand.name ? platformBrand.name : `${brandName} · ${platformBrand.name}`;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = brandLogo;
  }, [brandLogo, brandName]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/candidatos?q=${encodeURIComponent(query)}` : '/candidatos');
  }

  async function signOut() {
    try {
      if (me?.organization?.id) {
        await fetch('/api/organizations/members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: me.organization.id, status: 'offline' }),
          keepalive: true,
        });
      }
      await authClient.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <div className="app-frame" style={brandStyle as CSSProperties}>
      <PresenceHeartbeat organizationId={me?.organization?.id} />
      <div className={`mobile-scrim ${mobileOpen ? 'is-visible' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark brand-mark-logo"><img src={brandLogo} alt="" onError={(event) => { event.currentTarget.src = platformBrand.logoPath; }} /></div>
          <div>
            <strong>{brandName}</strong>
            <span>{brandDescriptor}</span>
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
              <Link className={`sidebar-link ${active ? 'is-active' : ''}`} href={item.href} key={item.href} aria-current={active ? 'page' : undefined}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section-label sidebar-lower-label">Administração</div>
        <nav className="sidebar-nav" aria-label="Administração">
          {me?.organization && <Link className={`sidebar-link ${pathname.startsWith('/organizacao') ? 'is-active' : ''}`} href="/organizacao" aria-current={pathname.startsWith('/organizacao') ? 'page' : undefined}>
            <Icon name="briefcase" />
            <span>Organização</span>
          </Link>}
          {me?.organization && <Link className={`sidebar-link ${pathname.startsWith('/empresas') ? 'is-active' : ''}`} href="/empresas" aria-current={pathname.startsWith('/empresas') ? 'page' : undefined}>
            <Icon name="building" />
            <span>Empresas</span>
          </Link>}
          {me?.membership?.role === 'admin' && <Link className={`sidebar-link ${pathname.startsWith('/administracao') ? 'is-active' : ''}`} href="/administracao" aria-current={pathname.startsWith('/administracao') ? 'page' : undefined}>
            <Icon name="users" />
            <span>Administração</span>
          </Link>}
          <Link className={`sidebar-link ${pathname.startsWith('/configuracoes') ? 'is-active' : ''}`} href="/configuracoes" aria-current={pathname.startsWith('/configuracoes') ? 'page' : undefined}>
            <AnimatedGearIcon />
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
            <NotificationCenter organizationId={me?.organization?.id} />
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
              onCompleted={(result) => setMe((current) => current ? { ...current, organization: result.organization, membership: result.membership } : current)}
            />
          ) : children}
        </main>
      </div>
    </div>
  );
}

function sameMeData(current: MeData | null, next: MeData) {
  if (!current) return false;
  return current.user.id === next.user.id
    && current.user.email === next.user.email
    && JSON.stringify(current.profile) === JSON.stringify(next.profile)
    && JSON.stringify(current.membership) === JSON.stringify(next.membership)
    && JSON.stringify(current.organization) === JSON.stringify(next.organization);
}
