import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SessionManager } from "@/components/auth/SessionManager";
import { DataLoader } from "@/components/layout/DataLoader";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

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
        <SessionManager />
        <DataLoader />
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-bg)] cc-scrollbar">
              <div className="page-shell">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
