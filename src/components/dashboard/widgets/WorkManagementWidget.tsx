import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { Badge } from '@/components/ui/Badge';
import { Project } from '@/types/models';
import { canViewProject } from '@/lib/permissions';

export const WorkManagementWidget = () => {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'IN_PROGRESS' | 'QC_PENDING' | 'UPCOMING'>('IN_PROGRESS');

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

  const inProgress = visibleProjects.filter(p => ['IN_PROGRESS', 'INTAKE_RECEIVED', 'MANAGER_REVIEW', 'PM_ASSIGNED', 'SCHEDULE_DRAFTING', 'SCHEDULE_PENDING_APPROVAL'].includes(p.status));
  const qcPending = visibleProjects.filter(p => p.status === 'QA_REVIEW');
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg)]/50">
        <h3 className="font-bold text-[var(--color-text-main)] flex items-center gap-2">
          업무관리
        </h3>
        <div className="flex gap-1 text-xs">
          <button 
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'IN_PROGRESS' ? 'bg-[var(--color-primary)] text-white font-medium' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
            onClick={() => setActiveTab('IN_PROGRESS')}
          >
            진행중 ({inProgress.length})
          </button>
          <button 
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'QC_PENDING' ? 'bg-orange-500 text-white font-medium' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
            onClick={() => setActiveTab('QC_PENDING')}
          >
            QC대기 ({qcPending.length})
          </button>
          <button 
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'UPCOMING' ? 'bg-red-500 text-white font-medium' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
            onClick={() => setActiveTab('UPCOMING')}
          >
            납품임박 ({upcomingDelivery.length})
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '300px' }}>
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-sub)] text-sm py-8">
            해당하는 프로젝트가 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {currentList.map((project: Project) => (
              <li key={project.id} className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors cursor-pointer group flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">
                    {project.title}
                  </span>
                  <div className="flex gap-1">
                    <Badge variant={project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? 'DEFAULT' : 'INFO'}>
                      {project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? '내부개발' : '수주'}
                    </Badge>
                    <Badge variant={project.status === 'QA_REVIEW' ? 'WARNING' : 'SUCCESS'}>
                      {project.status === 'QA_REVIEW' ? 'QC 대기' : '진행'}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)]">
                  <span>부서/PM: {project.departmentId} / {project.pmId || '미정'}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)]">
                  <span>{project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? '완료예정일' : '납품일'}: {project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? project.targetDate || '미정' : project.deliveryDate || '미정'}</span>
                  <span>진척도: {project.progress || 0}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 text-xs text-gray-400 text-center">
        * 회의록/전화/메일/납품차수 등 상세 원본 기능은 이번 위젯에 직접 구현되지 않았습니다 (Deferred).
      </div>
    </div>
  );
};
