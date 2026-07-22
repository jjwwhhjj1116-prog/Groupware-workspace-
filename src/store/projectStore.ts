import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, ProjectStatus, PostDeliveryWorkRequest, RevisionRequest } from '@/types/models';
import { fullProjects } from '@/data/fullScheduleSeed';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuditStore } from '@/store/auditStore';
import { canEditProject } from '@/lib/permissions';

interface ProjectState {
  projects: Project[];
  postDeliveryWorkRequests: PostDeliveryWorkRequest[];
  revisionRequests: RevisionRequest[];
  loadDummyProjects: () => void;
  addRevisionRequest: (request: Omit<RevisionRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateRevisionRequestStatus: (requestId: string, status: RevisionRequest['status']) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'progress'>) => Project;
  assignPM: (projectId: string, pmId: string) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  updateProjectField: <K extends keyof Project>(projectId: string, field: K, value: Project[K]) => void;
  addPostDeliveryWorkRequest: (request: Omit<PostDeliveryWorkRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  approvePostDeliveryWorkRequest: (requestId: string, approvedBy: string) => void;
  rejectPostDeliveryWorkRequest: (requestId: string, rejectedBy: string) => void;
  batchCloseOverdueProjects: (closedBy: string) => { totalClosed: number; projectIds: string[] };
  replaceProjects: (projects: Project[]) => void;
  resetProjects: () => void;
}

const initialRevisionRequests: RevisionRequest[] = [
  {
    id: 'rev_1',
    projectId: 'proj_sangincheon',
    title: '내부 도면 수정 요청',
    description: '구조 상세도 표기 누락 수정 필요',
    requestedByClient: 'Internal QA',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useProjectStore = create<ProjectState>()(persist((set, get) => ({
  projects: [],
  postDeliveryWorkRequests: [],
  revisionRequests: initialRevisionRequests,
  
  loadDummyProjects: () => set({ projects: fullProjects }),

  addRevisionRequest: (requestData) => set((state) => {
    const newReq: RevisionRequest = {
      ...requestData,
      id: `rev${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { revisionRequests: [...state.revisionRequests, newReq] };
  }),

  updateRevisionRequestStatus: (requestId, status) => set((state) => ({
    revisionRequests: state.revisionRequests.map(r => 
      r.id === requestId ? { ...r, status, updatedAt: new Date().toISOString() } : r
    )
  })),

  addProject: (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: `p${Date.now()}`,
      status: 'INTAKE_RECEIVED',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    return newProject;
  },

  assignPM: (projectId, pmId) => set((state) => {
    const { currentUser, users } = useAuthStore.getState();
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;

    if (currentUser && !canEditProject(currentUser, project)) {
      console.warn('Permission denied: cannot assign PM');
      return state;
    }

    const pm = users.find(u => u.id === pmId);
    if (!pm) {
      console.warn(`Cannot assign PM: User ${pmId} does not exist.`);
      return state;
    }

    if (currentUser) {
      useAuditStore.getState().addLog({
        actorId: currentUser.id,
        action: 'UPDATE',
        entityType: 'PROJECT',
        entityId: projectId,
        message: `PM assigned from ${project.pmId || 'none'} to ${pmId}`
      });
      
      if (pmId !== currentUser.id) {
        useNotificationStore.getState().addNotification({
          userId: pmId,
          type: 'ASSIGNMENT',
          title: '프로젝트 PM 배정 알림',
          message: `새로운 프로젝트 "${project.title}"의 PM으로 배정되었습니다.`,
          priority: 'NORMAL'
        });
      }
    }

    return {
      projects: state.projects.map(p => 
        p.id === projectId 
          ? { ...p, pmId, status: 'PM_ASSIGNED', updatedAt: new Date().toISOString() } 
          : p
      )
    };
  }),

  updateProjectStatus: (projectId, status) => set((state) => {
    const { currentUser } = useAuthStore.getState();
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;

    if (currentUser && !canEditProject(currentUser, project)) {
      console.warn('Permission denied: cannot update project status');
      return state;
    }

    if (currentUser) {
      useAuditStore.getState().addLog({
        actorId: currentUser.id,
        action: 'UPDATE',
        entityType: 'PROJECT',
        entityId: projectId,
        message: `Project status changed from ${project.status} to ${status}`
      });
    }

    return {
      projects: state.projects.map(p =>
        p.id === projectId
          ? { ...p, status, updatedAt: new Date().toISOString() }
          : p
      )
    };
  }),

  updateProjectField: (projectId, field, value) => set((state) => ({
    projects: state.projects.map(p =>
      p.id === projectId
        ? { ...p, [field]: value, updatedAt: new Date().toISOString() }
        : p
    )
  })),

  addPostDeliveryWorkRequest: (requestData) => set((state) => {
    const newRequest: PostDeliveryWorkRequest = {
      ...requestData,
      id: `pdw${Date.now()}`,
      status: 'PENDING_PM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Also mark project's delivery lifecycle temporarily if needed, but usually we just add request.
    const updatedProjects = state.projects.map(p => 
      p.id === requestData.projectId 
        ? { ...p, deliveryLifecycle: 'POST_DELIVERY_WORK_REQUESTED' as const }
        : p
    );

    return { 
      postDeliveryWorkRequests: [...state.postDeliveryWorkRequests, newRequest],
      projects: updatedProjects
    };
  }),

  approvePostDeliveryWorkRequest: (requestId, approvedBy) => set((state) => {
    const request = state.postDeliveryWorkRequests.find(r => r.id === requestId);
    if (!request) return state;

    const updatedRequests = state.postDeliveryWorkRequests.map(r =>
      r.id === requestId ? { ...r, status: 'APPROVED' as const, updatedAt: new Date().toISOString() } : r
    );

    const updatedProjects = state.projects.map(p => {
      if (p.id === request.projectId) {
        return {
          ...p,
          status: 'IN_PROGRESS' as const, // Force status to IN_PROGRESS to move out of COMPLETED column
          deliveryLifecycle: 'POST_DELIVERY_WORK_IN_PROGRESS' as const, // Or REOPENED
          deliveryDate: request.impactDeliveryDate && request.newSuggestedDeliveryDate ? request.newSuggestedDeliveryDate : p.deliveryDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    return {
      postDeliveryWorkRequests: updatedRequests,
      projects: updatedProjects
    };
  }),

  rejectPostDeliveryWorkRequest: (requestId, rejectedBy) => set((state) => {
    const request = state.postDeliveryWorkRequests.find(r => r.id === requestId);
    if (!request) return state;

    const updatedRequests = state.postDeliveryWorkRequests.map(r =>
      r.id === requestId ? { ...r, status: 'REJECTED' as const, updatedAt: new Date().toISOString() } : r
    );

    // If no other pending requests exist, we might want to revert deliveryLifecycle to whatever it was.
    // For simplicity, we just delete the specific flag.
    const hasOtherPending = updatedRequests.some(r => r.projectId === request.projectId && r.status === 'PENDING_PM');
    
    const updatedProjects = state.projects.map(p => {
      if (p.id === request.projectId) {
        return {
          ...p,
          deliveryLifecycle: hasOtherPending ? 'POST_DELIVERY_WORK_REQUESTED' as const : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    return {
      postDeliveryWorkRequests: updatedRequests,
      projects: updatedProjects
    };
  }),

  batchCloseOverdueProjects: (closedBy) => {
    const state = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueProjects = state.projects.filter(p => {
      // Must not be already completed/archived
      if (['COMPLETED', 'ARCHIVED'].includes(p.status)) return false;
      
      // Must have delivery date
      if (!p.deliveryDate) return false;
      
      const delivery = new Date(p.deliveryDate);
      delivery.setHours(0, 0, 0, 0);
      const diffTime = delivery.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Must be overdue
      if (diffDays >= 0) return false;

      // Must NOT have pending post-delivery work requests
      const hasPendingRequests = state.postDeliveryWorkRequests.some(
        r => r.projectId === p.id && ['PENDING_PM', 'PENDING_MANAGER', 'PENDING_SUPER_ADMIN'].includes(r.status)
      );
      if (hasPendingRequests) return false;

      return true;
    });

    if (overdueProjects.length === 0) {
      return { totalClosed: 0, projectIds: [] };
    }

    const targetIds = overdueProjects.map(p => p.id);

    set((state) => ({
      projects: state.projects.map(p => 
        targetIds.includes(p.id) 
          ? { 
              ...p, 
              status: 'COMPLETED' as const, 
              deliveryLifecycle: 'DELIVERY_CLOSED_MANUAL' as const,
              deliveryClosedAt: new Date().toISOString(),
              deliveryClosedBy: closedBy,
              updatedAt: new Date().toISOString()
            }
          : p
      )
    }));

    return { totalClosed: targetIds.length, projectIds: targetIds };
  },

  replaceProjects: (projects) => set({ projects }),
  resetProjects: () => set({ projects: [], postDeliveryWorkRequests: [], revisionRequests: [] })
}), { name: 'project-storage' }));
