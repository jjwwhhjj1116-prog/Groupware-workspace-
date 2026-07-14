import { PersonnelCard, Project, TaskCard, PersonalSchedule, ApprovalRequest } from '@/types/models';

export const canViewProject = (user: PersonnelCard, project: Project): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DEPARTMENT_MANAGER') return user.departmentId === project.departmentId;
  if (user.role === 'PM') return project.pmId === user.id || project.departmentId === user.departmentId;
  return project.departmentId === user.departmentId;
};

export const canEditProject = (user: PersonnelCard, project: Project): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DEPARTMENT_MANAGER') return user.departmentId === project.departmentId;
  if (user.role === 'PM') return project.pmId === user.id;
  return false;
};

export const canViewTask = (user: PersonnelCard, task: TaskCard): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DEPARTMENT_MANAGER') return user.departmentId === task.departmentId;
  if (user.role === 'PM') return task.pmId === user.id || task.departmentId === user.departmentId;
  return task.assigneeId === user.id;
};

export const canEditTask = (user: PersonnelCard, task: TaskCard): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DEPARTMENT_MANAGER') return user.departmentId === task.departmentId;
  if (user.role === 'PM') return task.pmId === user.id;
  return task.assigneeId === user.id;
};

export const canMoveTask = (user: PersonnelCard, task: TaskCard, targetStatus: string): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DEPARTMENT_MANAGER') return user.departmentId === task.departmentId;
  if (user.role === 'PM') return task.pmId === user.id;
  return task.assigneeId === user.id;
};

export const canApproveRequest = (user: PersonnelCard, request: ApprovalRequest): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DEPARTMENT_MANAGER') return request.managerId === user.id;
  if (user.role === 'PM') return request.pmId === user.id;
  return false;
};

export const canViewEmployeeSchedule = (viewer: PersonnelCard, targetUser: PersonnelCard): boolean => {
  if (viewer.role === 'SUPER_ADMIN') return true;
  if (viewer.id === targetUser.id) return true;
  
  // Workers cannot see PM, MANAGER, or SUPER_ADMIN schedules
  if (viewer.role === 'WORKER' && ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM'].includes(targetUser.role)) {
    return false;
  }
  
  // Default: can see if in the same department
  return viewer.departmentId === targetUser.departmentId;
};

export const canViewSchedule = (viewer: PersonnelCard, schedule: PersonalSchedule, targetUser?: PersonnelCard): boolean => {
  if (viewer.role === 'SUPER_ADMIN') return true;
  if (viewer.id === schedule.userId) return true;
  
  // If targetUser is provided, check if we can even view their schedules
  if (targetUser && !canViewEmployeeSchedule(viewer, targetUser)) return false;

  // Visibility level checks
  if (schedule.visibility === 'PRIVATE') return false;
  if (schedule.visibility === 'SUPER_ADMIN_ONLY') return false;
  if (schedule.visibility === 'MANAGER_ONLY' && !['SUPER_ADMIN', 'DEPARTMENT_MANAGER'].includes(viewer.role)) return false;

  // Department level
  if (schedule.visibility === 'DEPARTMENT' && viewer.departmentId !== schedule.departmentId) return false;
  
  return true;
};

export const getVisibleProjects = (user: PersonnelCard, projects: Project[]): Project[] => {
  return projects.filter(p => canViewProject(user, p));
};

export const getVisibleTasks = (user: PersonnelCard, tasks: TaskCard[]): TaskCard[] => {
  return tasks.filter(t => canViewTask(user, t));
};

export const getVisibleScheduleItems = (user: PersonnelCard, items: PersonalSchedule[]): PersonalSchedule[] => {
  return items.filter(s => canViewSchedule(user, s));
};

export const canViewHrDashboard = (user: PersonnelCard): boolean => {
  return ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'SYSTEM_ADMIN'].includes(user.role);
};
