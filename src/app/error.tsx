'use client';

import { Icon } from '@/components/ui/icon';
import Link from 'next/link';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="login-form-side"><div className="setup-callout" style={{ maxWidth: 520 }}><p className="eyebrow">O fluxo parou</p><h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Não foi possível abrir esta tela.</h1><p style={{ marginTop: 8 }}>Tente novamente. Se o problema continuar, confira a configuração do Supabase.</p><div className="heading-actions" style={{ marginTop: 18 }}><button className="button button-primary" onClick={() => reset()}><Icon name="activity" size={16} />Tentar novamente</button><Link href="/dashboard" className="button button-secondary">Voltar ao dashboard</Link></div></div></main>;
}
