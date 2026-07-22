import type { ApprovalRequest, Notification, PersonalSchedule, Project, TaskCard } from '@/types/models';

type OperationCollections = {
  projects: Project[];
  tasks: TaskCard[];
  schedules: PersonalSchedule[];
  requests: ApprovalRequest[];
  notifications: Notification[];
};

const mergeById = <T extends { id: string }>(base: T[], local: T[]) => {
  const merged = new Map(base.map((item) => [item.id, item]));
  local.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

export function mergeLocalOperationData(
  base: OperationCollections,
  current: OperationCollections,
): OperationCollections {
  const localProjects = current.projects.filter((project) =>
    project.source === 'LOCAL_OPERATION' || project.source === 'ESTIMATE_REQUEST'
  );
  const localProjectIds = new Set(localProjects.map((project) => project.id));
  const localTasks = current.tasks.filter((task) => localProjectIds.has(task.projectId));
  const localTaskIds = new Set(localTasks.map((task) => task.id));
  const localSchedules = current.schedules.filter((schedule) =>
    (schedule.relatedProjectId && localProjectIds.has(schedule.relatedProjectId)) ||
    (schedule.relatedTaskId && localTaskIds.has(schedule.relatedTaskId)) ||
    schedule.sourceSheet === 'LOCAL_OPERATION'
  );
  const localRequests = current.requests.filter((request) =>
    Boolean(request.projectId && localProjectIds.has(request.projectId))
  );
  const localRequestIds = new Set(localRequests.map((request) => request.id));
  const localNotifications = current.notifications.filter((notification) =>
    Boolean(
      (notification.relatedProjectId && localProjectIds.has(notification.relatedProjectId)) ||
      (notification.relatedTaskId && localTaskIds.has(notification.relatedTaskId)) ||
      (notification.relatedApprovalId && localRequestIds.has(notification.relatedApprovalId))
    )
  );

  return {
    projects: mergeById(base.projects, localProjects),
    tasks: mergeById(base.tasks, localTasks),
    schedules: mergeById(base.schedules, localSchedules),
    requests: mergeById(base.requests, localRequests),
    notifications: mergeById(base.notifications, localNotifications),
  };
}
