import Link from 'next/link';

export default function NotFound() {
  return <main className="login-form-side"><div className="setup-callout" style={{ maxWidth: 520 }}><p className="eyebrow">404</p><h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Esta página não existe.</h1><p style={{ marginTop: 8 }}>O endereço pode ter mudado ou o registro não está disponível.</p><Link href="/dashboard" className="button button-primary" style={{ marginTop: 18 }}>Voltar ao dashboard</Link></div></main>;
}
