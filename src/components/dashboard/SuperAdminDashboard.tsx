import React from 'react';
import { SummaryCard } from './SummaryCard';
import { Briefcase, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { getDeliveryUrgencyBucket, getProjectOverallProgress } from '@/lib/selectors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { WorkManagementWidget } from './widgets/WorkManagementWidget';
import { ManagementSupportWidget } from './widgets/ManagementSupportWidget';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export const SuperAdminDashboard = ({ selectedMonth }: { selectedMonth: string | 'ALL' }) => {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const [projectTypeFilter, setProjectTypeFilter] = React.useState<'INTERNAL_DEVELOPMENT' | 'CLIENT_ORDER'>('INTERNAL_DEVELOPMENT');

  const activeProjects = projects.filter(p => {
    if (p.isDeleted || p.archiveStatus === 'ARCHIVED') return false;
    if ((p.projectSourceType || 'CLIENT_ORDER') !== projectTypeFilter) return false;
    if (selectedMonth === 'ALL') return true;
    const dateStr = p.projectSourceType === 'INTERNAL_DEVELOPMENT' ? p.targetDate : p.deliveryDate;
    if (!dateStr) return false;
    return dateStr.startsWith(selectedMonth);
  });

  // 지표 계산
  const urgentProjectsCount = activeProjects.filter(p => getDeliveryUrgencyBucket(p) === 'WITHIN_1_WEEK').length;

  const pendingApprovalsCount = tasks.filter(t => t.approvalStatus === 'PENDING').length;

  const delayedTasksCount = tasks.filter(t => {
    if (t.status === 'DONE') return false;
    if (!t.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.dueDate < today;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title={t('dashboard.metric.inProgressProject')}
          value={activeProjects.length.toString()}
          subtitle={t('dashboard.metric.inProgressDesc')}
          icon={Briefcase}
          colorClass="bg-indigo-500"
        />
        <SummaryCard
          title={t('dashboard.metric.overdueProject')}
          value={urgentProjectsCount.toString()}
          subtitle={t('dashboard.metric.overdueDesc')}
          icon={AlertTriangle}
          colorClass="bg-red-500"
        />
        <SummaryCard
          title={t('dashboard.sa.pendingApproval')}
          value={pendingApprovalsCount.toString()}
          subtitle={t('dashboard.sa.pendingApprovalDesc')}
          icon={CheckCircle}
          colorClass="bg-blue-500"
        />
        <SummaryCard
          title={t('dashboard.sa.delayedTask')}
          value={delayedTasksCount.toString()}
          subtitle={t('dashboard.sa.delayedTaskDesc')}
          icon={Clock}
          colorClass="bg-orange-500"
        />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--color-text-main)]">{t('dashboard.sa.projectSummary')}</h2>
          <select
            className="border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors"
            value={projectTypeFilter}
            onChange={(e) => setProjectTypeFilter(e.target.value as 'INTERNAL_DEVELOPMENT' | 'CLIENT_ORDER')}
          >
            <option value="INTERNAL_DEVELOPMENT">{t('dashboard.projectType.internal')}</option>
            <option value="CLIENT_ORDER">{t('dashboard.projectType.order')}</option>
          </select>
        </div>

        {activeProjects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t('dashboard.sa.emptyProject')}
              description={t('dashboard.sa.emptyProjectDesc')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.projectName')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.category')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.status')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.progress')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{projectTypeFilter === 'CLIENT_ORDER' ? t('dashboard.table.deliveryExpected') : t('dashboard.table.targetExpected')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {activeProjects.map(p => {
                  const progress = getProjectOverallProgress(p, tasks);
                  const urgency = getDeliveryUrgencyBucket(p);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-5 py-3 font-semibold text-[var(--color-text-main)]">{p.title}</td>
                      <td className="px-5 py-3">
                        <Badge variant={p.projectSourceType === 'CLIENT_ORDER' ? 'INFO' : 'DEFAULT'}>
                          {p.projectSourceType === 'CLIENT_ORDER' ? t('dashboard.projectType.order') : t('dashboard.projectType.internal')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={p.status === 'COMPLETED' ? 'SUCCESS' : p.status === 'IN_PROGRESS' ? 'INFO' : 'DEFAULT'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-[var(--color-primary)] h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="font-semibold text-[var(--color-text-sub)] w-8">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${urgency === 'WITHIN_1_WEEK' ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-sub)]'}`}>
                          {p.deliveryDate || t('common.unset')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="h-[350px]">
          <WorkManagementWidget />
        </div>
        <div className="h-[350px]">
          <ManagementSupportWidget />
        </div>
      </div>
    </div>
  );
};
