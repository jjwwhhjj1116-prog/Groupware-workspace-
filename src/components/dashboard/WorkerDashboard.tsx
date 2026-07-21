import React from 'react';
import { SummaryCard } from './SummaryCard';
import { CheckCircle, AlertTriangle, Clock, List, CheckSquare } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProjectStore } from '@/store/projectStore';
import { Badge } from '@/components/ui/Badge';
import { WorkManagementWidget } from './widgets/WorkManagementWidget';
import { ManagementSupportWidget } from './widgets/ManagementSupportWidget';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export const WorkerDashboard = ({ selectedMonth }: { selectedMonth: string | 'ALL' }) => {
  const { currentUser } = useAuthStore();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const workerTasks = tasks.filter(t => {
    if (t.isDeleted || t.assigneeId !== currentUser?.id) return false;
    if (selectedMonth === 'ALL') return true;
    const p = projects.find(p => p.id === t.projectId);
    if (!p) return false;
    const dateStr = p.projectSourceType === 'INTERNAL_DEVELOPMENT' ? p.targetDate : p.deliveryDate;
    if (!dateStr) return false;
    return dateStr.startsWith(selectedMonth);
  });

  const completedTasksCount = workerTasks.filter(t => t.status === 'DONE').length;
  const pendingApprovalsCount = workerTasks.filter(t => t.approvalStatus === 'PENDING').length;
  const rejectedTasksCount = workerTasks.filter(t => t.approvalStatus === 'REJECTED').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title={t('dashboard.metric.myTasks')}
          value={workerTasks.length.toString()}
          subtitle={t('dashboard.metric.myTasksDesc')}
          icon={CheckSquare}
          colorClass="bg-indigo-500"
        />
        <SummaryCard
          title={t('dashboard.metric.completedTasks')}
          value={completedTasksCount.toString()}
          subtitle={t('dashboard.metric.completedTasksDesc')}
          icon={CheckCircle}
          colorClass="bg-green-500"
        />
        <SummaryCard
          title={t('dashboard.metric.pending')}
          value={pendingApprovalsCount.toString()}
          subtitle={t('dashboard.metric.pendingDesc')}
          icon={Clock}
          colorClass="bg-blue-500"
        />
        <SummaryCard
          title={t('dashboard.metric.revision')}
          value={rejectedTasksCount.toString()}
          subtitle={t('dashboard.metric.revisionDesc')}
          icon={AlertTriangle}
          colorClass="bg-red-500"
        />
      </div>

      <div className="cc-panel">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--color-text-main)]">{t('dashboard.section.recentTasks')}</h2>
        </div>

        {workerTasks.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t('dashboard.empty.noTasks')}
              description={t('dashboard.empty.noTasksDesc')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.taskName')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.project')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.status')}</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{t('dashboard.table.dueDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {workerTasks.slice(0, 10).map(task => (
                  <tr key={task.id} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-[var(--color-text-main)]">{task.title}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-[var(--color-text-sub)]">
                        {projects.find(p => p.id === task.projectId)?.title || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={task.status === 'DONE' ? 'SUCCESS' : task.status === 'IN_PROGRESS' ? 'INFO' : 'DEFAULT'}>
                        {task.status}
                      </Badge>
                      {task.approvalStatus === 'PENDING' && (
                        <Badge variant="WARNING" className="ml-2">{t('dashboard.status.pending')}</Badge>
                      )}
                      {task.approvalStatus === 'REJECTED' && (
                        <Badge variant="ERROR" className="ml-2">{t('dashboard.status.rejected')}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${
                        task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'DONE'
                          ? 'text-[var(--color-danger)]'
                          : 'text-[var(--color-text-sub)]'
                      }`}>
                        {task.dueDate || t('common.unset')}
                      </span>
                    </td>
                  </tr>
                ))}
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
