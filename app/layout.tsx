import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'DRIVAR Performance Dashboard',
  description: 'KPIs für Vermieter, Fahrzeuge und Wachstum',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
