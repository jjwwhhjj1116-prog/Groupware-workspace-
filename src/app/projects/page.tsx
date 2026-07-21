'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { Board, GroupByOption, BoardViewType } from '@/components/board/Board';
import { ProjectBoard } from '@/components/board/ProjectBoard';
import { ProjectPartBoard } from '@/components/board/ProjectPartBoard';
import { ProjectEvaluationModal } from '@/components/evaluation/ProjectEvaluationModal';
import { PostDeliveryWorkModal } from '@/components/delivery/PostDeliveryWorkModal';
import { PmDispatchModal } from '@/components/board/PmDispatchModal';
import { RevisionRequestModal } from '@/components/board/RevisionRequestModal';
import { ApprovalReviewModal } from '@/components/board/ApprovalReviewModal';
import { useApprovalStore } from '@/store/approvalStore';
import { useAuditStore } from '@/store/auditStore';
import { TaskStatus, ProjectSourceType, Project, ApprovalRequest } from '@/types/models';
import { DetailedLineStage, getProjectBoardColumn } from '@/lib/selectors';
import { canViewProject, canViewTask, canEditProject } from '@/lib/permissions';
import { FileText, ArrowLeft, ChevronRight, History, Wrench, Code2, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { ProjectOperationModal } from '@/components/projects/ProjectOperationModal';

export type ExtendedViewType = BoardViewType | 'PART' | 'HISTORY';

export default function ProjectBoardPage() {
  const projects = useProjectStore(state => state.projects);
  const revisionRequests = useProjectStore(state => state.revisionRequests);
  const postDeliveryWorkRequests = useProjectStore(state => state.postDeliveryWorkRequests);
  const { tasks, updateTaskStatus, updateDetailedLineStage, updateTaskAssignee, updateTaskPriority } = useTaskStore();
  const requests = useApprovalStore(state => state.requests);
  const auditLogs = useAuditStore(state => state.logs);
  const { currentUser, users } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('STATUS');
  const [viewType, setViewType] = useState<ExtendedViewType>('PART');
  const [showPersonalSchedules, setShowPersonalSchedules] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showPostDeliveryModal, setShowPostDeliveryModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [dispatchProject, setDispatchProject] = useState<Project | null>(null);
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<ProjectSourceType>('INTERNAL_DEVELOPMENT');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'APPROVAL' | 'COMPLETED' | 'AUDIT'>('ALL');
  const [operationProjectId, setOperationProjectId] = useState<string>('');

  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const applyPreset = (preset: string) => {
    if (preset === 'ASSIGNEE_VIEW') {
      setViewType('DETAILED');
      setGroupBy('ASSIGNEE');
    } else if (preset === 'PRIORITY_VIEW') {
      setViewType('DETAILED');
      setGroupBy('PRIORITY');
    }
  };

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;

  const accessibleProjects = projects.filter(p => {
    if (canViewProject(currentUser, p)) return true;
    if (currentUser.role === 'WORKER') {
      return tasks.some(t => t.projectId === p.id && t.assigneeId === currentUser.id && !t.isDeleted);
    }
    return false;
  });

  const filteredProjects = accessibleProjects.filter(p => {
    if (selectedMonth === 'ALL') return true;

    // Filter by tasks that overlap with the selected month
    const pTasks = tasks.filter(t => t.projectId === p.id && !t.isDeleted);
    return pTasks.some(t => {
      if (!t.startDate && !t.dueDate) return false;
      const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
      const end = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate!);

      const targetMonthStart = new Date(2026, selectedMonth - 1, 1);
      const targetMonthEnd = new Date(2026, selectedMonth, 0, 23, 59, 59);

      return start <= targetMonthEnd && end >= targetMonthStart;
    });
  }).filter(p => {
    const pSource = p.projectSourceType || 'CLIENT_ORDER';
    return pSource === activeTab;
  });

  // Auto-select removed to show Project Summary Board by default

  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId && !t.isDeleted && canViewTask(currentUser, t));

  const handleMoveTask = (taskId: string, targetId: string, groupByKey: GroupByOption) => {
    if (groupByKey === 'STATUS') {
      if (viewType === 'DETAILED') {
        updateDetailedLineStage(taskId, targetId as DetailedLineStage);
      } else {
        updateTaskStatus(taskId, targetId as TaskStatus);
      }
    } else if (groupByKey === 'ASSIGNEE') {
      updateTaskAssignee(taskId, targetId === 'UNASSIGNED' ? undefined : targetId);
    } else if (groupByKey === 'PRIORITY') {
      updateTaskPriority(taskId, targetId as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW');
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleProjectMove = (projectId: string, sourceColId: string, targetColId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (sourceColId === 'PRE_WORK' && targetColId === 'IN_PROGRESS') {
      const isAuthorized = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_MANAGER' || (currentUser.role === 'PM' && project.pmId === currentUser.id);
      if (!isAuthorized) {
        alert(t('projects.noAuthAlert'));
        return;
      }
      if (!project.pmId) {
        alert(t('projects.pmRequiredAlert'));
        return;
      }
      setDispatchProject(project);
    } else {
      if (!canEditProject(currentUser, project)) {
        alert(t('projects.noEditAuthAlert'));
        return;
      }

      // 일반 상태 변경
      const store = useProjectStore.getState();
      if (targetColId === 'IN_PROGRESS') store.updateProjectStatus(project.id, 'IN_PROGRESS');
      else if (targetColId === 'COMPLETED') store.updateProjectStatus(project.id, 'COMPLETED');
      else if (targetColId === 'PRE_WORK') store.updateProjectStatus(project.id, 'INTAKE_RECEIVED');
      else if (targetColId === 'REVISION') store.updateProjectStatus(project.id, 'REVISION_REQUESTED');
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Unified Header matching Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {selectedProject ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedProjectId('')}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] p-1.5 hover:bg-gray-100 rounded-md text-[var(--color-text-sub)] transition-colors"
                title={t('projects.btnBackToBoard')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1
                className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight cursor-pointer hover:text-[var(--color-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] rounded"
                onClick={() => setSelectedProjectId('')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProjectId(''); } }}
              >
                {t('projects.title')}
              </h1>
              <ChevronRight className="w-5 h-5 text-[var(--color-text-sub)] opacity-50" />
              <h1 className="text-2xl font-bold text-[var(--color-primary)] tracking-tight truncate max-w-xs">
                {selectedProject.title}
              </h1>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">{t('projects.title')}</h1>
              <p className="text-[var(--color-text-sub)] text-sm mt-1 font-medium">
                {t('projects.subtitle', { dept: currentUser.departmentName || t('header.dept.hq') })}
              </p>
            </>
          )}
        </div>

        {!selectedProjectId && (
          <div className="flex bg-gray-100/80 p-1 rounded-md border border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab('INTERNAL_DEVELOPMENT')}
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-[4px] transition-colors ${activeTab === 'INTERNAL_DEVELOPMENT' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]/50' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}
            >
              <Code2 className="w-4 h-4" />
              {t('devTeamWork')}
            </button>
            <button
              onClick={() => setActiveTab('CLIENT_ORDER')}
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-[4px] transition-colors ${activeTab === 'CLIENT_ORDER' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]/50' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}
            >
              <Briefcase className="w-4 h-4" />
              {t('externalProject')}
            </button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-center">
          {selectedProject && getProjectBoardColumn(selectedProject, new Date(), revisionRequests.some(r => r.projectId === selectedProject.id && (r.status === 'PENDING' || r.status === 'ACCEPTED'))) === 'COMPLETED' && currentUser.role !== 'SUPER_ADMIN' && (
            <button
              onClick={() => setShowPostDeliveryModal(true)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 font-semibold text-sm rounded-md border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {t('projects.btnPostWork')}
            </button>
          )}
          {selectedProject && getProjectBoardColumn(selectedProject, new Date(), revisionRequests.some(r => r.projectId === selectedProject.id && (r.status === 'PENDING' || r.status === 'ACCEPTED'))) === 'COMPLETED' && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 font-semibold text-sm rounded-md border border-orange-200 hover:bg-orange-100 transition-colors"
            >
              <Wrench className="w-4 h-4" />
              {t('projects.btnRevision')}
            </button>
          )}
          {currentUser.role === 'PM' && selectedProjectId && (
            <button
              onClick={() => setShowEvaluationModal(true)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold text-sm rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {t('projects.btnPmEval')}
            </button>
          )}

          <select
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] shadow-sm outline-none focus:border-[var(--color-primary)] transition-colors"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          >
            <option value="ALL">{t('projects.filterAllMonth')}</option>
            {[6, 7, 8].map(m => (
              <option key={m} value={m}>{t('projects.filterMonth', { month: m.toString() })}</option>
            ))}
          </select>

          <select
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] shadow-sm outline-none focus:border-[var(--color-primary)] transition-colors"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">{t('projects.filterAllProject')}</option>
            {filteredProjects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          {selectedProjectId && (
            <>
              <select
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] shadow-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                value={viewType}
                onChange={(e) => setViewType(e.target.value as ExtendedViewType)}
              >
                <option value="PART">{t('projects.viewPart')}</option>
                <option value="DETAILED">{t('projects.viewDetail')}</option>
                <option value="COLLAB">{t('projects.viewCollab')}</option>
                <option value="HISTORY">{t('projects.viewHistory')}</option>
              </select>
              {viewType !== 'PART' && viewType !== 'HISTORY' && (
                <select
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] shadow-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                >
                  <option value="STATUS">{t('projects.groupStatus')}</option>
                  <option value="ASSIGNEE">{t('projects.groupAssignee')}</option>
                  <option value="PRIORITY">{t('projects.groupPriority')}</option>
                </select>
              )}
            </>
          )}

          <button
            onClick={() => setShowPersonalSchedules(!showPersonalSchedules)}
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold rounded-md border shadow-sm transition-colors ${showPersonalSchedules ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'}`}
          >
            {t('projects.btnToggleSchedule')}
          </button>
        </div>
      </div>

      {selectedProjectId ? (
        viewType === 'PART' ? (
          <ProjectPartBoard
            projectId={selectedProjectId}
            tasks={projectTasks}
            users={users}
            onDispatchClick={() => {
              if (selectedProject) setDispatchProject(selectedProject);
            }}
          />
        ) : viewType === 'HISTORY' ? (
          <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border p-6 min-h-[400px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-[var(--color-border)] pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">{t('projects.history.title')}</h2>
                <p className="text-sm text-[var(--color-text-sub)]">{t('projects.history.subtitle')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'APPROVAL', 'COMPLETED', 'AUDIT'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                      historyFilter === f ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-sub)] hover:bg-gray-100'
                    }`}
                  >
                    {f === 'ALL' ? t('projects.history.filterAll') : f === 'APPROVAL' ? t('projects.history.filterApproval') : f === 'COMPLETED' ? t('projects.history.filterCompleted') : t('projects.history.filterAudit')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {/* Completed / Resolved items */}
              {(historyFilter === 'ALL' || historyFilter === 'COMPLETED') && (
                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg)]">
                  <h3 className="font-bold text-sm text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-green-600" /> {t('projects.history.completedRequests')}
                  </h3>
                  {revisionRequests.filter(r => r.projectId === selectedProjectId && r.status === 'RESOLVED').length === 0 && postDeliveryWorkRequests.filter(r => r.projectId === selectedProjectId && r.status === 'APPROVED').length === 0 && requests.filter(r => r.projectId === selectedProjectId && r.status === 'APPROVED').length === 0 ? (
                    <div className="text-xs text-[var(--color-text-sub)] bg-[var(--color-surface)] p-4 rounded-md text-center border border-dashed border-[var(--color-border-strong)]">{t('projects.history.emptyCompleted')}</div>
                  ) : (
                    <ul className="space-y-2">
                      {revisionRequests.filter(r => r.projectId === selectedProjectId && r.status === 'RESOLVED').map(req => (
                        <li key={req.id} className="bg-[var(--color-surface)] p-3 border rounded shadow-sm flex flex-col gap-1 opacity-70 hover:opacity-100 transition-opacity">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-[var(--color-text-main)]">{t('projects.history.tagRevisionComplete', { title: req.title })}</span>
                            <Badge variant="SUCCESS">{t('projects.history.tagDone')}</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-text-sub)]">{req.description}</p>
                          <div className="text-[10px] text-gray-400 mt-1">{t('projects.history.reqBy', { client: req.requestedByClient, date: new Date(req.createdAt).toLocaleString() })}</div>
                        </li>
                      ))}
                      {postDeliveryWorkRequests.filter(r => r.projectId === selectedProjectId && r.status === 'APPROVED').map(req => (
                        <li key={req.id} className="bg-[var(--color-surface)] p-3 border rounded shadow-sm flex flex-col gap-1 opacity-70 hover:opacity-100 transition-opacity">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-[var(--color-text-main)]">{t('projects.history.tagPostWorkComplete', { title: req.title })}</span>
                            <Badge variant="SUCCESS">{t('projects.history.tagApprovedDone')}</Badge>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">{new Date(req.createdAt).toLocaleString()}</div>
                        </li>
                      ))}
                      {requests.filter(r => r.projectId === selectedProjectId && r.status === 'APPROVED').map(req => (
                        <li key={req.id} className="bg-[var(--color-surface)] p-3 border rounded shadow-sm flex flex-col gap-1 opacity-70 hover:opacity-100 transition-opacity">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-[var(--color-text-main)]">{t('projects.history.tagApprove', { title: req.title })}</span>
                            <Badge variant="SUCCESS">{t('projects.history.tagApproved')}</Badge>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">{new Date(req.createdAt).toLocaleString()}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Pending Approvals */}
              {(historyFilter === 'ALL' || historyFilter === 'APPROVAL') && (
                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg)]">
                  <h3 className="font-bold text-sm text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-orange-500" /> {t('projects.history.pendingRequests')}
                  </h3>
                  {requests.filter(r => r.projectId === selectedProjectId && r.status === 'PENDING').length === 0 && revisionRequests.filter(r => r.projectId === selectedProjectId && (r.status === 'PENDING' || r.status === 'ACCEPTED')).length === 0 ? (
                    <div className="text-xs text-[var(--color-text-sub)] bg-[var(--color-surface)] p-4 rounded-md text-center border border-dashed border-[var(--color-border-strong)]">{t('projects.history.emptyPending')}</div>
                  ) : (
                    <ul className="space-y-2">
                      {revisionRequests.filter(r => r.projectId === selectedProjectId && (r.status === 'PENDING' || r.status === 'ACCEPTED')).map(req => (
                        <li key={req.id} className="bg-[var(--color-surface)] p-3 border border-orange-200 rounded-md shadow-sm flex flex-col gap-1 border-l-4 border-l-orange-400">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-orange-900">{t('projects.history.tagRevisionReq', { title: req.title })}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="WARNING">{req.status}</Badge>
                              <button
                                onClick={() => {
                                  useProjectStore.getState().updateRevisionRequestStatus(req.id, 'RESOLVED');
                                  alert(t('projects.history.alertMarkDone'));
                                }}
                                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] text-xs px-2 py-1 bg-green-50 text-green-700 font-bold rounded border border-green-200 hover:bg-green-100 transition-colors"
                              >
                                {t('projects.history.btnMarkDone')}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[var(--color-text-sub)]">{req.description}</p>
                          <div className="text-[10px] text-gray-400 mt-1">{t('projects.history.reqBy', { client: req.requestedByClient, date: new Date(req.createdAt).toLocaleString() })}</div>
                        </li>
                      ))}
                      {requests.filter(r => r.projectId === selectedProjectId && r.status === 'PENDING').map(req => (
                        <li key={req.id} className="bg-[var(--color-surface)] border border-blue-200 rounded-md shadow-sm flex flex-col hover:bg-blue-50 transition-colors border-l-4 border-l-blue-400">
                          <button
                            type="button"
                            onClick={() => setSelectedApprovalRequest(req)}
                            className="w-full text-left p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] rounded-md"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-blue-900">{t('projects.history.tagPending', { title: req.title })}</span>
                              <Badge variant="WARNING">{req.status}</Badge>
                            </div>
                            <div className="text-xs text-[var(--color-text-sub)] truncate mt-1">{req.reason}</div>
                            <div className="text-[10px] text-gray-400 mt-1">{t('projects.history.clickReview', { date: new Date(req.createdAt).toLocaleString() })}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Audit Logs */}
              {(historyFilter === 'ALL' || historyFilter === 'AUDIT') && (
                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg)]">
                  <h3 className="font-bold text-sm text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" /> {t('projects.history.auditLogTitle')}
                  </h3>
                  {auditLogs.filter(a => a.entityId === selectedProjectId || a.entityType === 'PROJECT').length === 0 ? (
                    <div className="text-xs text-[var(--color-text-sub)] bg-[var(--color-surface)] p-4 rounded-md text-center border border-dashed border-[var(--color-border-strong)]">
                      {t('projects.history.emptyAudit')}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {auditLogs.filter(a => a.entityId === selectedProjectId || a.entityType === 'PROJECT').map(log => (
                        <li key={log.id} className="bg-[var(--color-surface)] p-3 border border-purple-100 rounded-md shadow-sm flex flex-col gap-1 border-l-4 border-l-purple-400">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-[var(--color-text-main)]">{log.action}</span>
                            <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">{log.actorId}</span>
                          </div>
                          <div className="text-xs text-[var(--color-text-sub)] break-words">{log.message}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-1">{new Date(log.createdAt).toLocaleString()}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Board
            tasks={projectTasks}
            onMoveTask={handleMoveTask}
            currentUser={currentUser}
            viewType={viewType as BoardViewType}
            groupBy={groupBy}
            users={users}
          />
        )
      ) : (
        <ProjectBoard
          projects={filteredProjects}
          tasks={tasks}
          revisionRequests={revisionRequests}
          groupBy={groupBy}
          onProjectClick={setSelectedProjectId}
          onOperationClick={setOperationProjectId}
          onProjectMove={handleProjectMove}
        />
      )}

      {operationProjectId && <ProjectOperationModal projectId={operationProjectId} onClose={() => setOperationProjectId('')} />}

      {dispatchProject && (
        <PmDispatchModal
          project={dispatchProject}
          onClose={() => setDispatchProject(null)}
          onSuccess={() => setDispatchProject(null)}
        />
      )}

      {showEvaluationModal && selectedProjectId && (
        <ProjectEvaluationModal
          projectId={selectedProjectId}
          onClose={() => setShowEvaluationModal(false)}
        />
      )}

      {showPostDeliveryModal && selectedProjectId && (
        <PostDeliveryWorkModal
          projectId={selectedProjectId}
          onClose={() => setShowPostDeliveryModal(false)}
        />
      )}
      {showRevisionModal && selectedProjectId && (
        <RevisionRequestModal
          project={projects.find(p => p.id === selectedProjectId)!}
          onClose={() => setShowRevisionModal(false)}
        />
      )}
      {selectedApprovalRequest && (
        <ApprovalReviewModal
          request={selectedApprovalRequest}
          onClose={() => setSelectedApprovalRequest(null)}
        />
      )}

      {selectedApprovalRequest && (
        <ApprovalReviewModal
          request={selectedApprovalRequest}
          onClose={() => setSelectedApprovalRequest(null)}
        />
      )}
    </div>
  );
}
