'use client';

import React from 'react';
import Link from 'next/link';
import { ListTodo, TrendingUp, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { mockUsers } from '@/data/mockData';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { NotificationPopover } from './NotificationPopover';

export const Header = () => {
  const { currentUser, loginAs, appMode, dataSourceMode, setAppMode } = useAuthStore();
  const { settings, updateSettings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  React.useEffect(() => {
    document.documentElement.lang = settings.uiLanguage;
  }, [settings.uiLanguage]);

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: t('header.role.superAdmin'),
      SYSTEM_ADMIN: t('header.role.systemAdmin'),
      DEPARTMENT_MANAGER: t('header.role.deptManager'),
      PM: t('header.role.pm'),
      WORKER: t('header.role.worker'),
    };
    return roleMap[role] || role;
  };

  const getDeptName = () => {
    if (!currentUser) return '';
    if (currentUser.departmentName) return currentUser.departmentName;
    if (currentUser.teamName) return currentUser.teamName;
    if (currentUser.companyId === 'CON_COST') return t('header.dept.hq');
    if (currentUser.companyId === 'VIET_QS') return 'Viet_QS';
    return t('header.dept.none');
  };

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-16 min-w-0 items-center border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/95 px-3 shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur-md sm:px-4 xl:px-6">
      <div className="mr-3 h-8 w-[108px] shrink-0 md:hidden">
        <BrandLogo />
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-bold text-[var(--color-text-main)]">
            {currentUser ? `${getDeptName()} · ${getRoleName(currentUser.role)}` : t('header.loginRequired')}
          </h2>
          <p className="hidden text-[11px] font-semibold text-[var(--color-text-sub)] 2xl:block">
            {t('header.data.prefix')} {dataSourceMode === 'JSON_OPERATION_DATA' ? t('header.data.json') :
              dataSourceMode === 'DEMO_SEED_DATA' ? t('header.data.demo') :
                dataSourceMode === 'EXCEL_IMPORT_DATA' ? t('header.data.excel') : t('header.data.empty')}
          </p>
        </div>

        {currentUser && ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role) && (
          <div className="ml-2 hidden rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-1 xl:flex">
            <button
              type="button"
              aria-pressed={appMode === 'DAILY_WORK'}
              onClick={() => setAppMode('DAILY_WORK')}
              className={`min-h-8 rounded-lg px-3 text-[11px] font-bold focus-visible:outline-none ${appMode === 'DAILY_WORK'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary-strong)] shadow-sm'
                : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}
            >
              {t('header.mode.real')}
            </button>
            <button
              type="button"
              aria-pressed={appMode === 'ADMIN_VALIDATION'}
              onClick={() => setAppMode('ADMIN_VALIDATION')}
              className={`min-h-8 rounded-lg px-3 text-[11px] font-bold focus-visible:outline-none ${appMode === 'ADMIN_VALIDATION'
                ? 'bg-[var(--color-surface)] text-[var(--cc-danger-700)] shadow-sm'
                : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}
            >
              {t('header.mode.validation')}
            </button>
          </div>
        )}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex shrink-0 items-center rounded-lg border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-0.5 text-[10px] font-black" aria-label="Language">
          <button
            type="button"
            aria-pressed={settings.uiLanguage === 'ko'}
            onClick={() => updateSettings({ uiLanguage: 'ko' })}
            className={`min-h-7 rounded-md px-2 focus-visible:outline-none ${settings.uiLanguage === 'ko' ? 'bg-[var(--color-surface)] text-[var(--color-primary-strong)] shadow-sm' : 'text-[var(--color-text-sub)]'}`}
          >
            KOR
          </button>
          <button
            type="button"
            aria-pressed={settings.uiLanguage === 'vi'}
            onClick={() => updateSettings({ uiLanguage: 'vi' })}
            className={`min-h-7 rounded-md px-2 focus-visible:outline-none ${settings.uiLanguage === 'vi' ? 'bg-[var(--color-surface)] text-[var(--color-primary-strong)] shadow-sm' : 'text-[var(--color-text-sub)]'}`}
          >
            VIET
          </button>
        </div>

        <label className="sr-only" htmlFor="header-account-selector">{t('header.accountSelector')}</label>
        <select
          id="header-account-selector"
          className="min-h-9 min-w-0 max-w-[118px] rounded-lg border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-2 text-xs font-semibold text-[var(--color-text-sub)] outline-none sm:max-w-[190px] xl:max-w-[260px]"
          value={currentUser?.id || ''}
          onChange={(event) => loginAs(event.target.value)}
        >
          {mockUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {getUserDisplayName(user)} ({user.jobTitle || user.organizationRank || user.role})
            </option>
          ))}
        </select>

        <div className="hidden items-center gap-1 border-l border-[var(--color-border)] pl-3 lg:flex">
          <Link href="/approvals" className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-[var(--color-text-sub)] hover:bg-[var(--cc-orange-50)] hover:text-[var(--color-primary-strong)] focus-visible:outline-none">
            <ListTodo className="h-4 w-4" aria-hidden="true" />
            <span className="hidden 2xl:inline">{t('header.nav.approvals')}</span>
          </Link>
          <Link href="/evaluation" className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-[var(--color-text-sub)] hover:bg-[var(--cc-orange-50)] hover:text-[var(--color-primary-strong)] focus-visible:outline-none">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            <span className="hidden 2xl:inline">{t('header.nav.evaluation')}</span>
          </Link>
          <NotificationPopover />
        </div>

        <Link href="/settings" aria-label={t('settings')} className="hidden min-h-10 items-center gap-2 rounded-xl px-2 hover:bg-[var(--cc-orange-50)] focus-visible:outline-none sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--cc-orange-200)] bg-[var(--cc-orange-50)] text-[var(--color-primary-strong)]">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden text-[13px] font-bold text-[var(--color-text-main)] 2xl:inline">{getUserDisplayName(currentUser)}</span>
        </Link>
      </div>
    </header>
  );
};
