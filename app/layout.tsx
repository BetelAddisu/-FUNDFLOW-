import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundFlow — Accessible SME Applications",
  description:
    "Conversational application for Ethiopian micro and small enterprises. Web and Telegram feed one evidence-backed engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}