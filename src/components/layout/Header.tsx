'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, LogOut, Menu, MoonStar, Search, Settings2, ShieldCheck, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useUiStore } from '@/store/uiStore';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { NotificationPopover } from './NotificationPopover';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: '최고관리자',
  SYSTEM_ADMIN: '시스템관리자',
  DEPARTMENT_MANAGER: '본부장',
  PM: 'PM',
  WORKER: '실무자',
  EVALUATION_ADMIN: '평가관리자',
};

export function Header() {
  const { currentUser, logout, appMode, setAppMode } = useAuthStore();
  const { settings, updateSettings } = useTranslationStore();
  const { isDarkMode, toggleDarkMode } = useUiStore();
  const [profileOpen, setProfileOpen] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.lang = settings.uiLanguage;
  }, [settings.uiLanguage]);

  if (!currentUser) return null;
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role);
  const scopeLabel = currentUser.role === 'SUPER_ADMIN' ? '전사' : currentUser.departmentName || currentUser.teamName || '소속부서';

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-[76px] min-w-0 items-center border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/92 px-4 shadow-[0_8px_24px_rgba(25,45,91,.04)] backdrop-blur-xl sm:px-6">
      <button type="button" aria-label="메뉴 열기" className="mr-3 rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-2.5 text-[var(--color-text-sub)] xl:hidden"><Menu className="h-5 w-5" /></button>
      <div className="mr-4 h-9 w-[132px] shrink-0 xl:hidden"><BrandLogo /></div>

      <label className="hidden min-h-11 w-full max-w-[460px] items-center rounded-2xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 text-[var(--color-text-sub)] focus-within:border-[#4e6fd8] focus-within:ring-4 focus-within:ring-[#4e6fd8]/10 md:flex">
        <Search className="mr-3 h-4 w-4" />
        <input className="w-full bg-transparent text-sm font-semibold text-[var(--color-text-main)] outline-none" placeholder="프로젝트, 문서, 담당자 통합검색" aria-label="통합검색" />
        <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[9px] font-black text-[var(--color-text-sub)]">⌘ K</kbd>
      </label>

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2.5">
        {isAdmin && (
          <div className="hidden rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-1 2xl:flex">
            <button type="button" onClick={() => setAppMode('DAILY_WORK')} className={`rounded-lg px-3 py-2 text-[10px] font-black ${appMode === 'DAILY_WORK' ? 'bg-[var(--color-surface)] text-[#3453a4] shadow-sm' : 'text-[var(--color-text-sub)]'}`}>업무모드</button>
            <button type="button" onClick={() => setAppMode('ADMIN_VALIDATION')} className={`rounded-lg px-3 py-2 text-[10px] font-black ${appMode === 'ADMIN_VALIDATION' ? 'bg-[var(--color-surface)] text-[#eb6300] shadow-sm' : 'text-[var(--color-text-sub)]'}`}>관리모드</button>
          </div>
        )}

        <div className="hidden items-center rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-0.5 sm:flex" aria-label="언어 선택">
          <button type="button" onClick={() => updateSettings({ uiLanguage: 'ko' })} aria-pressed={settings.uiLanguage === 'ko'} className={`min-h-8 rounded-lg px-2.5 text-[10px] font-black ${settings.uiLanguage === 'ko' ? 'bg-[var(--color-surface)] text-[#3453a4] shadow-sm' : 'text-[var(--color-text-sub)]'}`}>KR</button>
          <button type="button" onClick={() => updateSettings({ uiLanguage: 'vi' })} aria-pressed={settings.uiLanguage === 'vi'} className={`min-h-8 rounded-lg px-2.5 text-[10px] font-black ${settings.uiLanguage === 'vi' ? 'bg-[var(--color-surface)] text-[#3453a4] shadow-sm' : 'text-[var(--color-text-sub)]'}`}>VI</button>
        </div>

        <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? '라이트 모드' : '다크 모드'} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] text-[var(--color-text-sub)] hover:-translate-y-0.5 hover:text-[#3453a4] hover:shadow-md">
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <div className="hidden lg:block"><NotificationPopover /></div>
        <button type="button" aria-label="알림" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] text-[var(--color-text-sub)] lg:hidden"><Bell className="h-4 w-4" /></button>

        <div className="relative">
          <button type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} className="flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 pr-2.5 shadow-[0_7px_18px_rgba(39,62,122,.08)] hover:-translate-y-0.5 hover:shadow-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#5576dc] to-[#273e7a] text-xs font-black text-white shadow-sm">{currentUser.name.slice(0, 1)}</span>
            <span className="hidden min-w-0 text-left sm:block">
              <strong className="block max-w-[112px] truncate text-[11px] font-black text-[var(--color-text-main)]">{currentUser.displayName || currentUser.name}</strong>
              <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--color-text-sub)]"><ShieldCheck className="h-2.5 w-2.5 text-[#eb6300]" /> {roleLabels[currentUser.role]} · {scopeLabel}</span>
            </span>
            <ChevronDown className={`hidden h-3.5 w-3.5 text-[var(--color-text-sub)] transition-transform sm:block ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--cc-shadow-3)]">
              <div className="mb-2 rounded-xl bg-[var(--cc-surface-2)] p-3">
                <p className="text-xs font-black text-[var(--color-text-main)]">{currentUser.name}</p>
                <p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">접근등급 · {roleLabels[currentUser.role]} / {scopeLabel}</p>
              </div>
              <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-2)] hover:text-[var(--color-text-main)]"><Settings2 className="h-4 w-4" /> 개인 설정</Link>
              {isAdmin && <Link href="/settings/permissions" onClick={() => setProfileOpen(false)} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-2)] hover:text-[var(--color-text-main)]"><ShieldCheck className="h-4 w-4" /> 권한 관리</Link>}
              <button type="button" onClick={logout} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><LogOut className="h-4 w-4" /> 로그아웃</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
