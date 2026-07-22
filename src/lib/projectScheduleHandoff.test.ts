import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { canAccessNavigation, getNavigationAccessLevel } from './navigationAccess';
import { mergeLocalOperationData } from './operationOverlay';
import { useApprovalStore } from '@/store/approvalStore';
import { useAuditStore } from '@/store/auditStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useProjectStore } from '@/store/projectStore';
import { isScheduleEligibleTask, useScheduleStore } from '@/store/scheduleStore';
import { useTaskStore } from '@/store/taskStore';
import type { ApprovalRequest, PersonnelCard, Project, TaskCard } from '@/types/models';

const manager: PersonnelCard = {
  id: 'manager-validation',
  name: 'Validation Manager',
  departmentId: 'dept-validation',
  role: 'DEPARTMENT_MANAGER',
  employmentStatus: 'ACTIVE',
  isActive: true,
};

const pm: PersonnelCard = {
  id: 'pm-validation',
  name: 'Validation PM',
  departmentId: 'dept-validation',
  role: 'PM',
  employmentStatus: 'ACTIVE',
  isActive: true,
};

const worker: PersonnelCard = {
  id: 'worker-validation',
  name: 'Validation Worker',
  departmentId: 'dept-validation',
  role: 'WORKER',
  employmentStatus: 'ACTIVE',
  isActive: true,
};

const project: Project = {
  id: 'project-validation',
  title: 'Project schedule validation',
  priority: 'NORMAL',
  status: 'SCHEDULE_PENDING_APPROVAL',
  departmentId: 'dept-validation',
  managerId: manager.id,
  pmId: pm.id,
  source: 'LOCAL_OPERATION',
};

const task = (id: string, requestId: string): TaskCard => ({
  id,
  projectId: project.id,
  title: `Validation task ${id}`,
  status: 'TODO',
  priority: 'NORMAL',
  assigneeId: worker.id,
  pmId: pm.id,
  departmentId: project.departmentId,
  startDate: '2026-07-22',
  dueDate: '2026-07-24',
  orderIndex: 0,
  approvalStatus: 'PENDING',
  approvalRequestId: requestId,
  sourceType: 'PM_DISPATCH',
});

const request = (id: string): ApprovalRequest => ({
  id,
  type: 'SCHEDULE_APPROVAL',
  projectId: project.id,
  requestedBy: pm.id,
  pmId: pm.id,
  managerId: manager.id,
  status: 'PENDING',
  title: 'Approve project schedule',
  reason: 'PM dispatch',
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
});

beforeEach(() => {
  useAuthStore.setState({ currentUser: manager, users: [manager, pm, worker] });
  useProjectStore.setState({ projects: [project], postDeliveryWorkRequests: [], revisionRequests: [] });
  useTaskStore.setState({ tasks: [], progressUpdates: [], checklists: [], artifacts: [], blockers: [], workSegments: [] });
  useScheduleStore.setState({ schedules: [] });
  useApprovalStore.setState({ requests: [] });
  useNotificationStore.setState({ notifications: [] });
  useAuditStore.getState().resetLogs();
});

test('schedule approval creates one official schedule per approved task and is idempotent', { concurrency: false }, () => {
  const approvalId = 'approval-validation';
  const pendingTasks = [task('task-a', approvalId), task('task-b', approvalId)];
  useTaskStore.setState({ tasks: pendingTasks });
  useApprovalStore.setState({ requests: [request(approvalId)] });

  assert.equal(pendingTasks.every((item) => !isScheduleEligibleTask(item)), true);
  useApprovalStore.getState().updateApprovalStatus(approvalId, 'APPROVED', manager.id, 'Approved');

  assert.equal(useProjectStore.getState().projects[0].status, 'IN_PROGRESS');
  assert.equal(useTaskStore.getState().tasks.every((item) => item.approvalStatus === 'APPROVED'), true);
  assert.equal(useScheduleStore.getState().schedules.length, 2);
  assert.deepEqual(
    useScheduleStore.getState().schedules.map((item) => item.relatedTaskId).sort(),
    ['task-a', 'task-b'],
  );

  useApprovalStore.getState().updateApprovalStatus(approvalId, 'APPROVED', manager.id, 'Approved again');
  assert.equal(useScheduleStore.getState().schedules.length, 2);
});

test('schedule rejection rejects tasks and does not leave official schedules', { concurrency: false }, () => {
  const approvalId = 'approval-rejection';
  const pendingTask = task('task-rejected', approvalId);
  useTaskStore.setState({ tasks: [pendingTask] });
  useScheduleStore.getState().upsertTaskSchedule({ ...pendingTask, approvalStatus: 'APPROVED' }, manager.id);
  useApprovalStore.setState({ requests: [request(approvalId)] });

  useApprovalStore.getState().updateApprovalStatus(approvalId, 'REJECTED', manager.id, 'Revise dates');

  assert.equal(useProjectStore.getState().projects[0].status, 'SCHEDULE_REJECTED');
  assert.equal(useTaskStore.getState().tasks[0].approvalStatus, 'REJECTED');
  assert.equal(useScheduleStore.getState().schedules.length, 0);
});

test('worker cannot approve a manager-scoped schedule request', { concurrency: false }, () => {
  const approvalId = 'approval-forbidden';
  useTaskStore.setState({ tasks: [task('task-forbidden', approvalId)] });
  useApprovalStore.setState({ requests: [request(approvalId)] });
  useAuthStore.setState({ currentUser: worker });

  useApprovalStore.getState().updateApprovalStatus(approvalId, 'APPROVED', worker.id, 'Not allowed');

  assert.equal(useApprovalStore.getState().requests[0].status, 'PENDING');
  assert.equal(useTaskStore.getState().tasks[0].approvalStatus, 'PENDING');
  assert.equal(useScheduleStore.getState().schedules.length, 0);
});

test('PM cannot approve their own project schedule request', { concurrency: false }, () => {
  const approvalId = 'approval-self-review';
  useTaskStore.setState({ tasks: [task('task-self-review', approvalId)] });
  useApprovalStore.setState({ requests: [request(approvalId)] });
  useAuthStore.setState({ currentUser: pm });

  useApprovalStore.getState().updateApprovalStatus(approvalId, 'APPROVED', pm.id, 'Self approval');

  assert.equal(useApprovalStore.getState().requests[0].status, 'PENDING');
  assert.equal(useTaskStore.getState().tasks[0].approvalStatus, 'PENDING');
});

test('JSON operation overlay preserves only local workflow records', { concurrency: false }, () => {
  const approvalId = 'approval-overlay';
  const localTask = task('task-overlay', approvalId);
  const estimateProject = { ...project, id: 'estimate-project', source: 'ESTIMATE_REQUEST' as const };
  const localSchedule = useScheduleStore.getState().upsertTaskSchedule(
    { ...localTask, approvalStatus: 'APPROVED' },
    manager.id,
  )!;
  const merged = mergeLocalOperationData({
    projects: [], tasks: [], schedules: [], requests: [], notifications: [],
  }, {
    projects: [project, estimateProject, { ...project, id: 'demo-project', source: 'DEMO' }],
    tasks: [localTask, { ...localTask, id: 'demo-task', projectId: 'demo-project' }],
    schedules: [localSchedule],
    requests: [request(approvalId)],
    notifications: [],
  });

  assert.deepEqual(merged.projects.map((item) => item.id), [project.id, estimateProject.id]);
  assert.deepEqual(merged.tasks.map((item) => item.id), [localTask.id]);
  assert.deepEqual(merged.schedules.map((item) => item.relatedTaskId), [localTask.id]);
  assert.deepEqual(merged.requests.map((item) => item.id), [approvalId]);
});

test('navigation access keeps admin, PM, and worker menus separated', () => {
  const workerLevel = getNavigationAccessLevel(worker);
  const pmLevel = getNavigationAccessLevel(pm);
  const adminLevel = getNavigationAccessLevel({ ...manager, role: 'SUPER_ADMIN' });

  assert.equal(canAccessNavigation({ roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] }, worker.role, workerLevel), false);
  assert.equal(canAccessNavigation({ roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] }, 'SUPER_ADMIN', adminLevel), true);
  assert.equal(canAccessNavigation({ roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM'], minLevel: 3 }, pm.role, pmLevel), true);
  assert.equal(canAccessNavigation({ roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM'], minLevel: 3 }, worker.role, workerLevel), false);
  assert.equal(canAccessNavigation({ minLevel: 2 }, worker.role, workerLevel), true);
});
