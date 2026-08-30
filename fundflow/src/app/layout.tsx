import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FundFlow — From a voice note to a fundable proposal',
  description: 'AI funding-intake and review system for Ethiopian SMEs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}