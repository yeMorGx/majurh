import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Majurh',
  description: 'Gestão de pessoas, candidatos e processos em um só lugar.',
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
