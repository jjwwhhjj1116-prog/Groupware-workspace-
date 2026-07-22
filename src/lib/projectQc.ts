import { Project, ProjectPmSchedule, ProjectQcCheck, ProjectQcChecklist, ProjectQcItem, ProjectQcItemStatus, Role } from '@/types/models';

export type ProjectQcActor = { id: string; role: Role; departmentId: string };

export const localProjectQcPermissions = (checklist: ProjectQcChecklist, actor: ProjectQcActor, assignmentIds: string[] = []) => {
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
  const isManager = actor.role === 'DEPARTMENT_MANAGER'
    && (actor.id === checklist.project.managerId || actor.departmentId === checklist.project.departmentId);
  const assigned = checklist.project.pmId === actor.id || assignmentIds.includes(actor.id) || checklist.items.some((item) => item.targets.includes(actor.id));
  return {
    canView: isAdmin || isManager || checklist.project.pmId === actor.id || assigned,
    canEdit: isAdmin || isManager || (actor.role === 'PM' && (checklist.project.pmId === actor.id || assigned)) || (actor.role === 'WORKER' && assigned),
    canSend: isAdmin || isManager || (actor.role === 'PM' && checklist.project.pmId === actor.id),
  };
};

export const deriveLocalQcStatus = (checks: ProjectQcCheck[], sent = false): ProjectQcItemStatus => {
  if (sent) return 'SENT';
  if (checks.length && checks.every((check) => check.done || check.na)) return 'CONFIRMED';
  if (checks.some((check) => check.done || check.na)) return 'PARTIAL';
  return 'PENDING';
};

export const makeLocalProjectQcChecklist = (project: Project, actor: ProjectQcActor, schedule?: ProjectPmSchedule): ProjectQcChecklist => {
  const timestamp = new Date().toISOString();
  const assignmentIds = schedule ? Object.values(schedule.assignment).filter(Boolean) as string[] : [];
  const checklist: ProjectQcChecklist = {
    id: project.id,
    projectId: project.id,
    status: 'OPEN',
    version: 1,
    createdBy: actor.id,
    updatedBy: actor.id,
    createdAt: project.createdAt || timestamp,
    updatedAt: project.updatedAt || timestamp,
    project: { id: project.id, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' },
    items: [],
    histories: [],
    permissions: { canView: false, canEdit: false, canSend: false },
  };
  return { ...checklist, permissions: localProjectQcPermissions(checklist, actor, assignmentIds) };
};

export const refreshLocalChecklist = (checklist: ProjectQcChecklist, actor: ProjectQcActor, assignmentIds: string[] = []) => {
  const status = !checklist.items.length ? 'OPEN' : checklist.items.every((item) => ['CONFIRMED', 'SENT'].includes(item.status)) ? 'COMPLETED' : checklist.items.some((item) => item.status !== 'PENDING') ? 'IN_PROGRESS' : 'OPEN';
  const next: ProjectQcChecklist = { ...checklist, status };
  return { ...next, permissions: localProjectQcPermissions(next, actor, assignmentIds) };
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
export const projectQcCsv = (items: ProjectQcItem[]) => {
  const headers = ['group', 'trade', 'serialNo', 'item', 'method', 'targets', 'status', 'comment', 'attachmentCount', 'eliminated', 'createdBy', 'createdAt', 'history'];
  const rows = items.map((item) => [item.group, item.trade, item.serialNo, item.item, item.method, item.targets.join(' / '), item.status, item.comment, item.attachments.length, item.eliminated, item.createdBy, item.createdAt, item.histories.map((entry) => `${entry.action}/${entry.actorId}/${entry.createdAt}`).join(' | ')]);
  return `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}`;
};
