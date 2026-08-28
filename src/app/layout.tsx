import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vieira Couto RH',
  description: 'Controle de candidatos, documentos e processos seletivos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
