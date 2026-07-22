import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CON-COST&Viet_QS OS - Project Management",
  description: "Internal Project Management and Operations System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-[var(--color-bg)] text-[var(--color-text-main)]`}>
        <ThemeProvider />
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </body>
    </html>
  );
}
