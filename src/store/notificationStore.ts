import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification } from '@/types/models';

interface NotificationState {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: (userId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  replaceNotifications: (notifications: Notification[]) => void;
  resetNotifications: () => void;
}

const mockNotifications: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'APPROVAL_REQUEST', title: '승인 요청', message: '새로운 연장 근무 신청이 접수되었습니다.', priority: 'HIGH', relatedApprovalId: 'a1', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n2', userId: 'u4', type: 'CONFLICT_ALERT', title: '일정 충돌 감지', message: '디자인 시안 마감 업무와 휴가 일정이 겹칩니다.', priority: 'CRITICAL', relatedTaskId: 't1', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'n3', userId: 'u3', type: 'PROJECT_ASSIGNMENT', title: '프로젝트 배정', message: '새로운 수주 프로젝트의 PM으로 배정되었습니다.', priority: 'NORMAL', relatedProjectId: 'p1', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

export const useNotificationStore = create<NotificationState>()(persist((set) => ({
  notifications: mockNotifications,
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
  })),
  markAllAsRead: (userId) => set((state) => ({
    notifications: state.notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n)
  })),
  addNotification: (notif) => set((state) => {
    // Grouping logic: If groupId is provided, find existing unread notification
    if (notif.groupId) {
      const existingIdx = state.notifications.findIndex(n => n.userId === notif.userId && n.groupId === notif.groupId && !n.isRead);
      if (existingIdx >= 0) {
        const updated = [...state.notifications];
        const existing = updated[existingIdx];
        updated[existingIdx] = {
          ...existing,
          message: notif.message, // update to latest message
          count: (existing.count || 1) + 1,
          createdAt: new Date().toISOString()
        };
        // Move to top
        const [moved] = updated.splice(existingIdx, 1);
        return { notifications: [moved, ...updated] };
      }
    }

    return {
      notifications: [{
        ...notif,
        id: `n${Date.now()}`,
        count: 1,
        isRead: false,
        createdAt: new Date().toISOString()
      }, ...state.notifications]
    };
  }),
  replaceNotifications: (notifications) => set({ notifications }),
  resetNotifications: () => set({ notifications: [] })
}), { name: 'notification-storage-v1' }));
