'use client';

import { useEffect, useMemo } from 'react';
import { buildProjectWorkflowSummary } from '@/lib/projectWorkflow';
import { useProjectDeliveryStore } from '@/store/projectDeliveryStore';
import { useProjectIntakeStore } from '@/store/projectIntakeStore';
import { useProjectOperationStore } from '@/store/projectOperationStore';
import { useProjectPmScheduleStore } from '@/store/projectPmScheduleStore';
import { useProjectProfitStore } from '@/store/projectProfitStore';
import { useProjectQcStore } from '@/store/projectQcStore';
import { Project, Role, TaskCard } from '@/types/models';

type WorkflowActor = { id: string; role: Role; departmentId: string };

export function useProjectWorkflow(project: Project, taskPendingApprovals = 0) {
  const intake = useProjectIntakeStore((state) => state.intakes.find((item) => item.projectId === project.id));
  const schedule = useProjectPmScheduleStore((state) => state.schedules.find((item) => item.projectId === project.id));
  const operation = useProjectOperationStore((state) => state.operations.find((item) => item.projectId === project.id));
  const qc = useProjectQcStore((state) => state.checklists.find((item) => item.projectId === project.id));
  const delivery = useProjectDeliveryStore((state) => state.workspaces.find((item) => item.projectId === project.id));
  const profit = useProjectProfitStore((state) => state.analyses.find((item) => item.projectId === project.id));

  return useMemo(() => buildProjectWorkflowSummary(project, {
    intake,
    schedule,
    operation,
    qc,
    delivery,
    profit,
    taskPendingApprovals,
  }), [project, intake, schedule, operation, qc, delivery, profit, taskPendingApprovals]);
}

export function useProjectWorkflowIndex(projects: Project[], tasks: TaskCard[] = []) {
  const intakes = useProjectIntakeStore((state) => state.intakes);
  const schedules = useProjectPmScheduleStore((state) => state.schedules);
  const operations = useProjectOperationStore((state) => state.operations);
  const checklists = useProjectQcStore((state) => state.checklists);
  const deliveryWorkspaces = useProjectDeliveryStore((state) => state.workspaces);
  const profitAnalyses = useProjectProfitStore((state) => state.analyses);

  return useMemo(() => {
    const intakeByProject = new Map(intakes.map((item) => [item.projectId, item]));
    const scheduleByProject = new Map(schedules.map((item) => [item.projectId, item]));
    const operationByProject = new Map(operations.map((item) => [item.projectId, item]));
    const qcByProject = new Map(checklists.map((item) => [item.projectId, item]));
    const deliveryByProject = new Map(deliveryWorkspaces.map((item) => [item.projectId, item]));
    const profitByProject = new Map(profitAnalyses.map((item) => [item.projectId, item]));
    const pendingByProject = new Map<string, number>();
    tasks.forEach((task) => {
      if (task.approvalStatus === 'PENDING') pendingByProject.set(task.projectId, (pendingByProject.get(task.projectId) || 0) + 1);
    });
    return new Map(projects.map((project) => [project.id, buildProjectWorkflowSummary(project, {
      intake: intakeByProject.get(project.id),
      schedule: scheduleByProject.get(project.id),
      operation: operationByProject.get(project.id),
      qc: qcByProject.get(project.id),
      delivery: deliveryByProject.get(project.id),
      profit: profitByProject.get(project.id),
      taskPendingApprovals: pendingByProject.get(project.id) || 0,
    })]));
  }, [projects, tasks, intakes, schedules, operations, checklists, deliveryWorkspaces, profitAnalyses]);
}

export function useProjectWorkflowOverviewSync(actor: WorkflowActor | null) {
  const syncIntakes = useProjectIntakeStore((state) => state.sync);
  const syncSchedules = useProjectPmScheduleStore((state) => state.sync);
  const syncOperations = useProjectOperationStore((state) => state.sync);

  useEffect(() => {
    if (!actor) return;
    void Promise.allSettled([syncIntakes(actor), syncSchedules(actor), syncOperations(actor)]);
  }, [actor?.id, actor?.role, actor?.departmentId, syncIntakes, syncSchedules, syncOperations]); // eslint-disable-line react-hooks/exhaustive-deps
}
