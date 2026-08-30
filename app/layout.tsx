import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'FUNDflow — AI Funding Intake & Defensible Review System',
  description: 'AI-assisted funding intake and review system for Ethiopian SMEs. Voice, text, and photo intake with zero-uncertainty evidence extraction and defensible reviewer ranking.',
  keywords: ['FUNDflow', 'SME Funding', 'Ethiopia', 'AI Intake', 'Grant Review', 'Addis Ababa Hackathon'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}