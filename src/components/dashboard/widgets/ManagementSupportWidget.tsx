import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useHrStore } from '@/store/hrStore';
import { Badge } from '@/components/ui/Badge';
import { Bell, Users, FileText } from 'lucide-react';
import { canViewHrDashboard } from '@/lib/permissions';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export const ManagementSupportWidget = () => {
  const { currentUser, users } = useAuthStore();
  const { notices } = useHrStore();
  const [activeTab, setActiveTab] = useState<'NOTICE' | 'HR' | 'DOCS'>('NOTICE');
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  if (!currentUser) return null;

  // Role-based visibility
  const canViewHr = canViewHrDashboard(currentUser);

  // Calculate stats from authStore users
  const activeUsers = users.filter(u => u.employmentStatus === 'ACTIVE' || !u.employmentStatus);
  const newHires = activeUsers.filter(u => {
    if (!u.createdAt) return false;
    const createdAt = new Date(u.createdAt);
    const today = new Date();
    return createdAt.getMonth() === today.getMonth() && createdAt.getFullYear() === today.getFullYear();
  }).length;

  const resigned = users.filter(u => u.employmentStatus === 'RESIGNED').length;

  // Group by department
  const deptCounts: Record<string, number> = {};
  activeUsers.forEach(u => {
    if (u.departmentId) {
      deptCounts[u.departmentId] = (deptCounts[u.departmentId] || 0) + 1;
    }
  });

  return (
    <div className="cc-panel flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 py-3">
        <h3 className="font-bold text-[var(--color-text-main)] flex items-center gap-2">
          {t('dashboard.widget.managementSupport')}
        </h3>
        <div className="flex gap-1 text-xs">
          <button
            aria-pressed={activeTab === 'NOTICE'}
            className={`min-h-8 px-2 py-1 rounded-lg transition-colors focus-visible:outline-none ${activeTab === 'NOTICE' ? 'bg-[var(--color-primary-strong)] text-white font-bold' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('NOTICE')}
          >
            <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> {t('dashboard.support.tabs.notice')}</span>
          </button>
          {canViewHr && (
            <button
              aria-pressed={activeTab === 'HR'}
              className={`min-h-8 px-2 py-1 rounded-lg transition-colors focus-visible:outline-none ${activeTab === 'HR' ? 'bg-[var(--color-primary-strong)] text-white font-bold' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
              onClick={() => setActiveTab('HR')}
            >
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t('dashboard.support.tabs.hr')}</span>
            </button>
          )}
          <button
            aria-pressed={activeTab === 'DOCS'}
            className={`min-h-8 px-2 py-1 rounded-lg transition-colors focus-visible:outline-none ${activeTab === 'DOCS' ? 'bg-[var(--color-primary-strong)] text-white font-bold' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('DOCS')}
          >
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {t('dashboard.support.tabs.form')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '300px' }}>
        {activeTab === 'NOTICE' && (
          <ul className="space-y-2">
            {notices.length === 0 ? (
              <li className="text-center py-8 text-sm text-[var(--color-text-sub)]">{t('dashboard.support.noNotice')}</li>
            ) : notices.map(notice => (
              <li key={notice.id} className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-1">
                  {notice.isImportant && <Badge variant="WARNING">{t('dashboard.support.important')}</Badge>}
                  <span className="font-semibold text-sm text-[var(--color-text-main)] line-clamp-1">{notice.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)] mt-2">
                  <span>{notice.author}</span>
                  <span>{new Date(notice.date).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'HR' && canViewHr && (
          <div className="space-y-2">
            <div className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
              <h4 className="text-sm font-semibold mb-2">{t('dashboard.support.hrSummary')}</h4>
              <ul className="text-xs text-[var(--color-text-sub)] space-y-1">
                <li>{t('dashboard.support.newHires')}: {newHires}{t('dashboard.support.peopleUnit')}</li>
                <li>{t('dashboard.support.resigned')}: {resigned}{t('dashboard.support.peopleUnit')}</li>
              </ul>
            </div>
            <div className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
              <h4 className="text-sm font-semibold mb-2">{t('dashboard.support.deptStatus')}</h4>
              {Object.keys(deptCounts).length === 0 ? (
                <div className="text-xs text-[var(--color-text-sub)]">{t('dashboard.support.noDeptData')}</div>
              ) : (
                <ul className="text-xs text-[var(--color-text-sub)] space-y-1">
                  {Object.entries(deptCounts).map(([dept, count]) => (
                    <li key={dept}>{dept}: {count}{t('dashboard.support.peopleUnit')}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'DOCS' && (
          <ul className="space-y-2">
             <li className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)] flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-main)]">{t('dashboard.support.form.vacation')}</span>
                <Badge variant="DEFAULT">{t('dashboard.support.download')}</Badge>
             </li>
             <li className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)] flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-main)]">{t('dashboard.support.form.overtime')}</span>
                <Badge variant="DEFAULT">{t('dashboard.support.download')}</Badge>
             </li>
          </ul>
        )}
      </div>
    </div>
  );
};
