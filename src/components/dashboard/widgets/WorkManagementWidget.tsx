import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { Badge } from '@/components/ui/Badge';
import { Project } from '@/types/models';
import { canViewProject } from '@/lib/permissions';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import Link from 'next/link';
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { getProjectWorkflowHref } from '@/lib/projectWorkflow';
import { useProjectWorkflowIndex, useProjectWorkflowOverviewSync } from '@/hooks/useProjectWorkflow';

export const WorkManagementWidget = () => {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'IN_PROGRESS' | 'QC_PENDING' | 'UPCOMING'>('IN_PROGRESS');
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const workflowByProject = useProjectWorkflowIndex(projects, tasks);
  useProjectWorkflowOverviewSync(currentUser ? { id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId } : null);

  if (!currentUser) return null;

  // Filter projects by permission
  let visibleProjects = projects.filter(p => {
    if (p.isDeleted || p.archiveStatus === 'ARCHIVED') return false;
    return canViewProject(currentUser, p);
  });

  if (currentUser.role === 'WORKER') {
    const userTaskProjectIds = new Set(
      tasks.filter(t => t.assigneeId === currentUser.id && !t.isDeleted).map(t => t.projectId)
    );
    visibleProjects = visibleProjects.filter(p => userTaskProjectIds.has(p.id));
  }

  const inProgress = visibleProjects.filter((project) => workflowByProject.get(project.id)?.phases.some((phase) => phase.state === 'ACTIVE' || phase.state === 'BLOCKED'));
  const qcPending = visibleProjects.filter((project) => {
    const qc = workflowByProject.get(project.id)?.phases.find((phase) => phase.id === 'QC');
    return qc?.state === 'ACTIVE' || qc?.state === 'BLOCKED';
  });
  const upcomingDelivery = visibleProjects.filter(p => {
    if (['COMPLETED', 'ARCHIVED'].includes(p.status)) return false;
    const targetDate = p.projectSourceType === 'INTERNAL_DEVELOPMENT' ? p.targetDate : p.deliveryDate;
    if (!targetDate) return false;

    const delivery = new Date(targetDate);
    const today = new Date();
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const getTabList = () => {
    switch(activeTab) {
      case 'IN_PROGRESS': return inProgress;
      case 'QC_PENDING': return qcPending;
      case 'UPCOMING': return upcomingDelivery;
      default: return [];
    }
  };

  const currentList = getTabList();

  return (
    <div className="cc-panel flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 py-3">
        <h3 className="font-bold text-[var(--color-text-main)] flex items-center gap-2">
          {t('dashboard.widget.workManagement')}
        </h3>
        <div className="flex gap-1 text-xs">
          <button
            aria-pressed={activeTab === 'IN_PROGRESS'}
            className={`min-h-8 px-2 py-1 rounded-lg transition-colors focus-visible:outline-none ${activeTab === 'IN_PROGRESS' ? 'bg-[var(--color-primary-strong)] text-white font-bold' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('IN_PROGRESS')}
          >
            {t('dashboard.work.inProgress')} ({inProgress.length})
          </button>
          <button
            aria-pressed={activeTab === 'QC_PENDING'}
            className={`min-h-8 px-2 py-1 rounded-lg transition-colors focus-visible:outline-none ${activeTab === 'QC_PENDING' ? 'bg-[var(--cc-warning-700)] text-white font-bold' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('QC_PENDING')}
          >
            {t('dashboard.work.qcPending')} ({qcPending.length})
          </button>
          <button
            aria-pressed={activeTab === 'UPCOMING'}
            className={`min-h-8 px-2 py-1 rounded-lg transition-colors focus-visible:outline-none ${activeTab === 'UPCOMING' ? 'bg-[var(--cc-danger-700)] text-white font-bold' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('UPCOMING')}
          >
            {t('dashboard.work.upcomingDelivery')} ({upcomingDelivery.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '300px' }}>
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-sub)] text-sm py-8">
            {t('dashboard.work.empty')}
          </div>
        ) : (
          <ul className="space-y-2">
            {currentList.map((project: Project) => {
              const workflow = workflowByProject.get(project.id)!;
              return <li key={project.id} className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-3 transition-[background-color,border-color] hover:border-[var(--cc-orange-300)] hover:bg-[var(--cc-orange-50)]">
                <div className="flex justify-between items-start">
                  <Link href={getProjectWorkflowHref(project.id, workflow.currentTab)} className="min-w-0 rounded font-semibold text-sm text-[var(--color-text-main)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                    <span className="line-clamp-1">{project.title}</span>
                  </Link>
                  <div className="flex gap-1">
                    <Badge variant={project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? 'DEFAULT' : 'INFO'}>
                      {project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? t('dashboard.projectType.internal') : t('dashboard.projectType.order')}
                    </Badge>
                    <Badge variant={project.status === 'QA_REVIEW' ? 'WARNING' : 'SUCCESS'}>
                      {project.status === 'QA_REVIEW' ? t('dashboard.work.qcPending') : t('dashboard.work.inProgress')}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)]">
                  <span>{t('dashboard.work.deptPm')}: {project.departmentId} / {project.pmId || t('common.unset')}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)]">
                  <span>{project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? t('dashboard.work.targetDate') : t('dashboard.work.deliveryDate')}: {project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? project.targetDate || t('common.unset') : project.deliveryDate || t('common.unset')}</span>
                  <span>{t('projectWorkflow.progress')}: {workflow.completion}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2 text-xs">
                  <span className="font-semibold text-[var(--color-primary)]">{t(`projectWorkflow.phase.${workflow.currentPhase}`)}</span>
                  <div className="flex items-center gap-2">
                    {workflow.pendingApprovals > 0 && <span className="inline-flex items-center gap-1 text-amber-700"><CircleAlert className="h-3.5 w-3.5" />{t('projectWorkflow.pendingApprovals', { count: workflow.pendingApprovals.toString() })}</span>}
                    <Link href={getProjectWorkflowHref(project.id, workflow.currentTab)} aria-label={t('projectWorkflow.openCurrent')} className="rounded p-1 text-[var(--color-text-sub)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><ArrowUpRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              </li>;
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 py-2 text-center text-xs text-[var(--color-text-sub)]">
        {t('projectWorkflow.widgetConnected')}
      </div>
    </div>
  );
};
