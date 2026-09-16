import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Administração | Majurh',
  description: 'Console privado de administração do Majurh.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
