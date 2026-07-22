'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoginScreen } from './LoginScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SessionManager } from './SessionManager';
import { DataLoader } from '@/components/layout/DataLoader';

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!currentUser) return <LoginScreen />;

  return (
    <>
      <SessionManager />
      <DataLoader />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="cc-scrollbar flex-1 overflow-x-hidden overflow-y-auto bg-[var(--color-bg)]">
            <div className="page-shell">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
