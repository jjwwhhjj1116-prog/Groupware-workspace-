'use client';
import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { DepartmentManagerDashboard } from '@/components/dashboard/DepartmentManagerDashboard';
import { PMDashboard } from '@/components/dashboard/PMDashboard';
import { WorkerDashboard } from '@/components/dashboard/WorkerDashboard';
import { useProjectStore } from '@/store/projectStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { Download, Upload } from 'lucide-react';

export default function Home() {
  const { currentUser } = useAuthStore();
  const { projects } = useProjectStore();
  const [selectedMonth, setSelectedMonth] = useState<string | 'ALL'>('ALL');

  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const getDeptName = () => {
    if (!currentUser) return '';
    if (currentUser.departmentName) return currentUser.departmentName;
    if (currentUser.teamName) return currentUser.teamName;
    if (currentUser.companyId === 'CON_COST') return t('header.dept.hq');
    if (currentUser.companyId === 'VIET_QS') return 'Viet_QS';
    return t('header.dept.none');
  };

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

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    projects.forEach(p => {
      const dateStr = p.deliveryDate || p.targetDate;
      if (dateStr && dateStr.length >= 7) {
        months.add(dateStr.substring(0, 7)); // "YYYY-MM"
      }
    });
    return Array.from(months).sort().reverse(); // 최신 월 순서로
  }, [projects]);

  if (!currentUser) return <div className="p-6">{t('dashboard.loading')}</div>;

  return (
    <div className="w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-[var(--color-text-sub)] text-sm mt-1 font-medium">
            {getDeptName()} · {getRoleName(currentUser.role)} {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] shadow-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="ALL">{t('dashboard.filter.allMonths')}</option>
            {availableMonths.map(m => {
              const [year, month] = m.split('-');
              return (
                <option key={m} value={m}>{t('common.yearMonth', { year, month: parseInt(month, 10).toString() })}</option>
              );
            })}
          </select>

          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            <Upload className="w-4 h-4 text-[var(--color-text-sub)]" />
            <span>{t('dashboard.actions.importJson')}</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            <Download className="w-4 h-4 text-[var(--color-text-sub)]" />
            <span>{t('dashboard.actions.exportJson')}</span>
          </button>
        </div>
      </div>

      {currentUser.role === 'SUPER_ADMIN' && <SuperAdminDashboard selectedMonth={selectedMonth} />}
      {currentUser.role === 'DEPARTMENT_MANAGER' && <DepartmentManagerDashboard selectedMonth={selectedMonth} />}
      {currentUser.role === 'PM' && <PMDashboard selectedMonth={selectedMonth} />}
      {currentUser.role === 'WORKER' && <WorkerDashboard selectedMonth={selectedMonth} />}
    </div>
  );
}
