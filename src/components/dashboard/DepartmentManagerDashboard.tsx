import React from 'react';
import { SummaryCard } from './SummaryCard';
import { Briefcase, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { getDeliveryUrgencyBucket, getProjectOverallProgress } from '@/lib/selectors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { WorkManagementWidget } from './widgets/WorkManagementWidget';
import { ManagementSupportWidget } from './widgets/ManagementSupportWidget';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export const DepartmentManagerDashboard = ({ selectedMonth }: { selectedMonth: string | 'ALL' }) => {
  const { currentUser } = useAuthStore();
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const [projectTypeFilter, setProjectTypeFilter] = React.useState<'INTERNAL_DEVELOPMENT' | 'CLIENT_ORDER'>('INTERNAL_DEVELOPMENT');

  const deptProjects = projects.filter(p => {
    if (p.isDeleted || p.archiveStatus === 'ARCHIVED' || p.departmentId !== currentUser?.departmentId) return false;
    if ((p.projectSourceType || 'CLIENT_ORDER') !== projectTypeFilter) return false;
    if (selectedMonth === 'ALL') return true;
    const dateStr = p.projectSourceType === 'INTERNAL_DEVELOPMENT' ? p.targetDate : p.deliveryDate;
    if (!dateStr) return false;
    return dateStr.startsWith(selectedMonth);
  });
  const deptTasks = tasks.filter(t => deptProjects.some(p => p.id === t.projectId));

  const urgentProjectsCount = deptProjects.filter(p => getDeliveryUrgencyBucket(p) === 'WITHIN_1_WEEK').length;
  const pendingApprovalsCount = deptTasks.filter(t => t.approvalStatus === 'PENDING').length;

  const delayedTasksCount = deptTasks.filter(t => {
    if (t.status === 'DONE') return false;
    if (!t.dueDate) return false;
    return t.dueDate < new Date().toISOString().split('T')[0];
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title={t('dashboard.dm.deptProject')}
          value={deptProjects.length.toString()}
          subtitle={t('dashboard.dm.deptProjectDesc')}
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
          title={t('dashboard.dm.pendingApproval')}
          value={pendingApprovalsCount.toString()}
          subtitle={t('dashboard.dm.pendingApprovalDesc')}
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

      <div className="cc-panel">
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

        {deptProjects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t('dashboard.dm.emptyProject')}
              description={t('dashboard.dm.emptyProjectDesc')}
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
                {deptProjects.map(p => {
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
