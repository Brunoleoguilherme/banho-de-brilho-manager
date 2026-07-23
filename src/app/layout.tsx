import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Banho de Brilho Manager",
  description: "Sistema de gestão da Banho de Brilho Limpezas Especiais",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans`}>{children}  <Analytics />
      </body>
    </html>
  );
}
