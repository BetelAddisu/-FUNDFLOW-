import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FundFlow',
  description: 'AI funding-intake and review system',
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