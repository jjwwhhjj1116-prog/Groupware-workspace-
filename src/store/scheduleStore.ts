import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PersonalSchedule, TaskCard } from '@/types/models';
import { fullSchedules } from '@/data/fullScheduleSeed';
import { useAuthStore } from '@/store/authStore';

interface ScheduleState {
  schedules: PersonalSchedule[];
  addSchedule: (schedule: Omit<PersonalSchedule, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvalStatus'>) => PersonalSchedule;
  upsertTaskSchedule: (task: TaskCard, actorId: string) => PersonalSchedule | null;
  removeTaskSchedules: (taskIds: string[]) => void;
  replaceSchedules: (schedules: PersonalSchedule[]) => void;
  resetSchedules: () => void;
}

const createScheduleId = () =>
  `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const getOfficialTaskScheduleId = (taskId: string) => `task-schedule-${taskId}`;

export const isScheduleEligibleTask = (task: TaskCard) =>
  task.approvalStatus === 'APPROVED' &&
  Boolean(task.assigneeId && task.startDate && task.dueDate && !task.isDeleted);

const initialSchedules: PersonalSchedule[] = [
  ...fullSchedules,
  {
    id: 's1',
    userId: 'u4',
    ownerRole: 'WORKER',
    departmentId: 'd1',
    title: '디자인 컨퍼런스 참석',
    description: '코엑스 디자인 박람회 및 컨퍼런스 외근',
    scheduleType: 'PERSONAL_WORK',
    startDateTime: '2026-07-08T09:00:00Z',
    endDateTime: '2026-07-08T18:00:00Z',
    isAllDay: true,
    visibility: 'DEPARTMENT',
    status: 'SCHEDULED',
    createdBy: 'u4',
    updatedBy: 'u4',
    requiresApproval: true,
    approvalStatus: 'APPROVED',
    createdAt: '2026-07-07T09:00:00Z',
    updatedAt: '2026-07-07T09:00:00Z'
  }
];

export const useScheduleStore = create<ScheduleState>()(persist((set, get) => ({
  schedules: initialSchedules,
  addSchedule: (scheduleData) => {
    const now = new Date().toISOString();
    const schedule: PersonalSchedule = {
      ...scheduleData,
      id: createScheduleId(),
      status: 'SCHEDULED',
      approvalStatus: scheduleData.requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ schedules: [...state.schedules, schedule] }));
    return schedule;
  },
  upsertTaskSchedule: (task, actorId) => {
    if (!isScheduleEligibleTask(task)) return null;

    const existing = get().schedules.find((schedule) => schedule.relatedTaskId === task.id);
    const now = new Date().toISOString();
    const assignee = useAuthStore.getState().users.find((user) => user.id === task.assigneeId);
    const schedule: PersonalSchedule = {
      id: existing?.id || getOfficialTaskScheduleId(task.id),
      userId: task.assigneeId!,
      ownerRole: assignee?.role || 'WORKER',
      departmentId: task.departmentId,
      title: task.title,
      description: task.description,
      scheduleType: 'PERSONAL_WORK',
      startDateTime: `${task.startDate}T09:00:00Z`,
      endDateTime: `${task.dueDate}T18:00:00Z`,
      isAllDay: true,
      visibility: 'DEPARTMENT',
      status: 'SCHEDULED',
      createdBy: existing?.createdBy || actorId,
      updatedBy: actorId,
      requiresApproval: false,
      approvalStatus: 'NOT_REQUIRED',
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
      sourceSheet: 'LOCAL_OPERATION',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    set((state) => ({
      schedules: existing
        ? state.schedules.map((item) => item.id === existing.id ? schedule : item)
        : [...state.schedules, schedule],
    }));
    return schedule;
  },
  removeTaskSchedules: (taskIds) => {
    const taskIdSet = new Set(taskIds);
    set((state) => ({
      schedules: state.schedules.filter((schedule) => !schedule.relatedTaskId || !taskIdSet.has(schedule.relatedTaskId)),
    }));
  },
  replaceSchedules: (schedules) => set({ schedules }),
  resetSchedules: () => set({ schedules: [] })
}), { name: 'schedule-storage-v1' }));
