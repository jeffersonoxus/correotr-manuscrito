import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corretor de Provas Manuscritas",
  description: "Sistema de correção de provas com IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
