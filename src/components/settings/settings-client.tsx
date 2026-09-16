'use client';

import { Icon } from '@/components/ui/icon';
import type { OrganizationBrand } from '@/lib/branding';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type SettingsData = {
  user: { email: string | null };
  profile: { full_name: string } | null;
  membership: { role: string } | null;
  organization: OrganizationBrand | null;
};

export function SettingsClient() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar as configurações.');
        return payload.data as SettingsData;
      })
      .then(setData)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.'))
      .finally(() => setLoading(false));
  }, []);

  const role = data?.membership?.role;
  return <div>
    <div className="page-heading"><div><p className="eyebrow">Preferências do espaço</p><h1>Configurações</h1><p>Consulte o contexto do seu acesso. Cadastros de empresas e vagas agora têm páginas próprias.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-state">Carregando configurações</div> : <div className="settings-stack">
      <div className="detail-grid">
        <section className="panel"><div className="panel-header"><div><h2>Organização atual</h2><p>Os dados exibidos respeitam este vínculo.</p></div><Icon name="briefcase" /></div><dl className="detail-list"><div><dt>Organização</dt><dd>{data?.organization?.name ?? 'Não configurada'}</dd></div><div><dt>Slug</dt><dd className="mono">{data?.organization?.slug ?? '—'}</dd></div><div><dt>Seu papel</dt><dd>{roleLabel(role)}</dd></div></dl></section>
        <section className="panel"><div className="panel-header"><div><h2>Seu acesso</h2><p>Identidade autenticada pelo Neon Auth.</p></div><Link className="text-link" href="/perfil">Editar perfil <Icon name="arrow-up-right" size={14} /></Link></div><dl className="detail-list"><div><dt>Nome</dt><dd>{data?.profile?.full_name ?? 'Perfil não preenchido'}</dd></div><div><dt>E-mail</dt><dd>{data?.user.email ?? 'Não disponível'}</dd></div></dl></section>
      </div>
      <div className="settings-shortcuts">
        <Link className="settings-shortcut" href="/vagas"><span className="settings-shortcut-icon"><Icon name="briefcase" /></span><span><strong>Vagas</strong><small>Quantidade, empresa e status das oportunidades.</small></span><Icon name="chevron-right" size={16} /></Link>
        <Link className="settings-shortcut" href="/empresas"><span className="settings-shortcut-icon"><Icon name="building" /></span><span><strong>Empresas</strong><small>Cadastros das empresas contratantes do espaço.</small></span><Icon name="chevron-right" size={16} /></Link>
      </div>
    </div>}
  </div>;
}

function roleLabel(role: string | undefined) {
  return role === 'admin' ? 'Administrador' : role === 'recruiter' ? 'Recrutador' : role === 'viewer' ? 'Visualizador' : 'Sem papel';
}
