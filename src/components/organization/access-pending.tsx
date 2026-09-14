'use client';

import { Icon } from '@/components/ui/icon';

export function AccessPending({ email }: { email: string | null }) {
  return (
    <div className="access-pending-wrap">
      <section className="access-pending-card panel">
        <div className="access-pending-icon"><Icon name="settings" size={20} /></div>
        <p className="eyebrow">Acesso restrito</p>
        <h1>Aguardando vínculo com uma organização.</h1>
        <p>Este usuário está autenticado, mas ainda não foi adicionado a um espaço do Majurh.</p>
        <div className="access-pending-email"><span>E-mail conectado</span><strong>{email || 'E-mail da sessão'}</strong></div>
        <p className="access-pending-note">Peça ao administrador da sua organização um convite de acesso. O cadastro de novos usuários é controlado pela administração.</p>
      </section>
    </div>
  );
}
