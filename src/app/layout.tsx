import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Carrier Base — Insurance Agency Platform',
  description: 'Trucking insurance CRM for carriers, producers, and agencies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
