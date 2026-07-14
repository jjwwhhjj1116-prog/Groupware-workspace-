'use client';
import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { mockUsers } from '@/data/mockData';
import { User, ListTodo, TrendingUp } from 'lucide-react';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { NotificationPopover } from './NotificationPopover';

export const Header = () => {
  const { currentUser, loginAs, appMode, dataSourceMode, setAppMode } = useAuthStore();
  const { settings, updateSettings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: t('header.role.superAdmin'),
      SYSTEM_ADMIN: t('header.role.systemAdmin'),
      DEPARTMENT_MANAGER: t('header.role.deptManager'),
      PM: t('header.role.pm'),
      WORKER: t('header.role.worker')
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
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-14 flex items-center justify-between px-6 z-40 sticky top-0">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-main)]">
          {currentUser ? `${getDeptName()} · ${getRoleName(currentUser.role)}` : t('header.loginRequired')}
        </h2>
        {currentUser && ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role) && (
          <div className="flex bg-gray-100/80 rounded p-1 border border-[var(--color-border)] gap-1 ml-2">
            <button
              onClick={() => setAppMode('DAILY_WORK')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                appMode === 'DAILY_WORK'
                  ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm border border-[var(--color-border)]'
                  : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {t('header.mode.real')}
            </button>
            <button
              onClick={() => setAppMode('ADMIN_VALIDATION')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                appMode === 'ADMIN_VALIDATION'
                  ? 'bg-[var(--color-surface)] text-rose-600 shadow-sm border border-[var(--color-border)]'
                  : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {t('header.mode.validation')}
            </button>
          </div>
        )}
        <div className="ml-1 px-2 py-1 bg-[var(--color-bg)] text-[var(--color-text-sub)] text-[11px] font-semibold rounded border border-[var(--color-border)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {t('header.data.prefix')} {dataSourceMode === 'JSON_OPERATION_DATA' ? t('header.data.json') :
                  dataSourceMode === 'DEMO_SEED_DATA' ? t('header.data.demo') :
                  dataSourceMode === 'EXCEL_IMPORT_DATA' ? t('header.data.excel') : t('header.data.empty')}
        </div>
      </div>
      <div className="flex items-center gap-5">
        {/* Language Toggle */}
        <div className="flex items-center bg-[var(--color-bg-sub)] rounded px-0.5 py-0.5 text-[10px] font-bold border border-[var(--color-border)]">
          <button
            onClick={() => updateSettings({ uiLanguage: 'ko' })}
            className={`px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${settings.uiLanguage === 'ko' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-sub)]'}`}
          >
            KOR
          </button>
          <button
            onClick={() => updateSettings({ uiLanguage: 'vi' })}
            className={`px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${settings.uiLanguage === 'vi' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-sub)]'}`}
          >
            VIET
          </button>
        </div>

        {/* Mock Login Switcher */}
        <select
          className="border border-[var(--color-border)] rounded-md px-2 py-1 text-xs bg-[var(--color-bg)] text-[var(--color-text-sub)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus:border-indigo-500"
          value={currentUser?.id || ''}
          onChange={(e) => loginAs(e.target.value)}
        >
          {mockUsers.map(u => (
            <option key={u.id} value={u.id}>
              {getUserDisplayName(u)} ({u.jobTitle || u.organizationRank || u.role})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-4 border-l border-[var(--color-border)] pl-4">
          <Link href="/approvals" className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded">
            <ListTodo className="w-4 h-4" /> {t('header.nav.approvals')}
          </Link>
          <Link href="/evaluation" className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded">
            <TrendingUp className="w-4 h-4" /> {t('header.nav.evaluation')}
          </Link>

          <NotificationPopover />
        </div>

        <Link href="/settings" className="flex items-center gap-2 cursor-pointer hover:bg-[var(--color-bg)] px-2 py-1.5 rounded-md transition-colors ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
          <div className="w-7 h-7 bg-indigo-50 text-[var(--color-primary)] rounded-full flex items-center justify-center font-bold border border-indigo-100">
            <User className="w-4 h-4" />
          </div>
          <span className="text-[13px] font-semibold text-[var(--color-text-main)]">{getUserDisplayName(currentUser)}</span>
        </Link>
      </div>
    </header>
  );
};
