import React, { useState } from 'react';
import { Project, TaskCard, LanguageCode } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useProjectStore } from '@/store/projectStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useApprovalStore } from '@/store/approvalStore';
import { useAuditStore } from '@/store/auditStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X, Plus, Trash2, Languages, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { detectLanguage } from '@/lib/translation/detector';
import { executeTranslation } from '@/lib/translation/providers';

interface Props {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export const PmDispatchModal: React.FC<Props> = ({ project, onClose, onSuccess }) => {
  const { users, currentUser } = useAuthStore();
  const { tasks: allTasks, addTask } = useTaskStore();
  const { updateProjectStatus } = useProjectStore();
  const { addNotification } = useNotificationStore();
  const { requests, addRequest } = useApprovalStore();
  const { addLog } = useAuditStore();
  const { schedules } = useScheduleStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const pmUser = users.find(u => u.id === project.pmId);
  const activeUsers = users.filter(u => u.employmentStatus === 'ACTIVE');
  const activeUserGroups = activeUsers.reduce<Record<string, typeof activeUsers>>((groups, user) => {
    const team = user.teamName || user.subDepartmentName || user.departmentName || '기타';
    groups[team] = [...(groups[team] || []), user];
    return groups;
  }, {});

  const rejectedRequest = requests
    .filter(r => r.projectId === project.id && r.type === 'SCHEDULE_APPROVAL' && r.status === 'REJECTED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const defaultInitialTask = {
    title: `${project.title} - 기본 공정`,
    description: '',
    scopeName: '기본 설계',
    assigneeId: '',
    priority: 'NORMAL' as const,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: project.targetDate || project.deliveryDate || new Date().toISOString().split('T')[0],
    estimatedHours: 8,
  };

  const getInitialTasks = () => {
    if (project.status === 'SCHEDULE_REJECTED' && rejectedRequest) {
      const rejectedTasks = allTasks.filter(t => t.approvalRequestId === rejectedRequest.id);
      if (rejectedTasks.length > 0) {
        return rejectedTasks.map(t => ({
          title: t.title,
          description: t.description,
          scopeName: t.scopeName,
          assigneeId: t.assigneeId,
          priority: t.priority as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
          startDate: t.startDate,
          dueDate: t.dueDate,
          estimatedHours: t.estimatedHours || 8,
          titleI18n: t.titleI18n
        }));
      }
    }
    return [defaultInitialTask];
  };

  const [tasks, setTasks] = useState<Partial<TaskCard>[]>(getInitialTasks());

  const handleAddTask = () => {
    setTasks([...tasks, { ...defaultInitialTask, title: '' }]);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateTask = (index: number, field: keyof TaskCard, value: any) => {
    setTasks((currentTasks) => {
      const newTasks = [...currentTasks];
      newTasks[index] = { ...newTasks[index], [field]: value };

      if (field === 'title') {
        const detected = detectLanguage(value as string);
        if (detected === 'ko' || detected === 'vi') {
          const i18n = newTasks[index].titleI18n || { originalLanguage: detected, originalText: value, translations: {} };
          i18n.originalLanguage = detected;
          i18n.originalText = value;
          newTasks[index].titleI18n = i18n;
        }
      }

      return newTasks;
    });
  };

  const handleTranslate = async (index: number) => {
    const task = tasks[index];
    if (!task.title) return;
    
    const detected = detectLanguage(task.title);
    if (detected === 'UNKNOWN') {
      alert(t('board.dispatch.alertNoLang'));
      return;
    }

    const sourceLang = detected as LanguageCode;
    const targetLang: LanguageCode = sourceLang === 'ko' ? 'vi' : 'ko';

    const newTasks = [...tasks];
    if (!newTasks[index].titleI18n) {
      newTasks[index].titleI18n = { originalLanguage: sourceLang, originalText: task.title, translations: {} };
    }
    
    newTasks[index].titleI18n!.translations![targetLang] = {
      text: t('board.dispatch.translating'),
      status: 'NEEDS_TRANSLATION'
    };
    setTasks([...newTasks]);

    const result = await executeTranslation({ text: task.title, sourceLang, targetLang });
    
    const updatedTasks = [...tasks];
    updatedTasks[index].titleI18n!.translations![targetLang] = {
      text: result.text || '',
      status: result.status,
      provider: result.provider,
      errorMessage: result.errorMessage,
      translatedAt: new Date().toISOString()
    };
    setTasks(updatedTasks);
  };

  const checkWorkerOverload = (assigneeId: string, startDate: string, dueDate: string, addedHours: number) => {
    if (!assigneeId || !startDate || !dueDate) return { overloaded: false, offDays: false };

    // Check OFF days
    const userSchedules = schedules.filter(s => s.userId === assigneeId && s.scheduleType === 'OFF');
    const hasOffDays = userSchedules.some(s => {
      const sStart = s.startDateTime.split('T')[0];
      const sEnd = s.endDateTime.split('T')[0];
      return (startDate <= sEnd && dueDate >= sStart);
    });

    // Check workload
    // Simplified: Find tasks for this user overlapping the period.
    const overlappingTasks = allTasks.filter(t => 
      t.assigneeId === assigneeId && 
      t.status !== 'DONE' && 
      t.status !== 'REJECTED' &&
      t.approvalStatus !== 'REJECTED' &&
      t.startDate && t.dueDate &&
      (startDate <= t.dueDate && dueDate >= t.startDate)
    );
    
    let totalExistingHours = 0;
    overlappingTasks.forEach(t => {
      totalExistingHours += (t.estimatedHours || 8); // default to 8 if missing
    });

    // Rough check: if total > 40 per week or something. We just check if totalExistingHours + addedHours > 40
    // Actually, "일일 8시간 초과" means we should check days.
    const days = Math.max(1, (new Date(dueDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24) + 1);
    const avgDaily = (totalExistingHours + addedHours) / days;

    return {
      overloaded: avgDaily > 8,
      offDays: hasOffDays,
      avgDaily: avgDaily.toFixed(1)
    };
  };

  const validate = () => {
    if (tasks.length === 0) {
      alert(t('board.dispatch.alertNoTask'));
      return false;
    }
    for (const tTask of tasks) {
      if (!tTask.title || !tTask.assigneeId || !tTask.startDate || !tTask.dueDate || !tTask.estimatedHours) {
        alert(t('board.dispatch.alertMissingFields'));
        return false;
      }
      if (tTask.startDate > tTask.dueDate) {
        alert(t('board.dispatch.alertInvalidDate'));
        return false;
      }
      const projectLimit = project.targetDate || project.deliveryDate;
      if (projectLimit && tTask.dueDate > projectLimit) {
        if (!window.confirm(t('board.dispatch.alertDeadlineExceeded').replace('{projectLimit}', projectLimit))) {
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    const reqTitle = `[${project.title}] PM 업무 배정 승인 요청`;
    const newApprovalRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    tasks.forEach((t, i) => {
      addTask({
        projectId: project.id,
        title: t.title!,
        description: t.description || '',
        scopeName: t.scopeName || '기본',
        status: 'TODO',
        priority: (t.priority as "URGENT" | "HIGH" | "NORMAL" | "LOW") || 'NORMAL',
        assigneeId: t.assigneeId,
        pmId: project.pmId,
        departmentId: project.departmentId,
        startDate: t.startDate,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
        orderIndex: i,
        approvalStatus: 'PENDING',
        approvalRequestId: newApprovalRequestId,
        sourceType: 'PM_DISPATCH',
        titleI18n: t.titleI18n
      });
    });

    updateProjectStatus(project.id, 'SCHEDULE_PENDING_APPROVAL');

    addRequest({
      id: newApprovalRequestId,
      type: 'SCHEDULE_APPROVAL',
      projectId: project.id,
      requestedBy: currentUser?.id || '',
      pmId: project.pmId,
      managerId: project.managerId,
      title: reqTitle,
      reason: project.status === 'SCHEDULE_REJECTED' ? '반려된 소요일정 재요청' : '업무 하달에 따른 소요일정 승인 요청',
    });

    if (project.managerId) {
      addNotification({
        userId: project.managerId,
        type: 'APPROVAL_REQUESTED',
        title: project.status === 'SCHEDULE_REJECTED' ? '일정 재승인 요청' : '신규 일정 승인 요청',
        message: reqTitle,
        priority: 'HIGH',
        relatedProjectId: project.id
      });
    }

    addLog({
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'SCHEDULE_DRAFTED',
      actorId: currentUser?.id || '',
      message: 'PM 업무 배정 완료 및 중간관리자 승인 요청'
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg)] rounded-t-xl">
          <h2 className="text-lg font-bold text-[var(--color-text-main)]">{t('board.dispatch.modalTitle')}</h2>
          <button onClick={onClose} className="text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {project.status === 'SCHEDULE_REJECTED' && rejectedRequest && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800">{t('board.dispatch.prevRejectReason')}</h4>
                <p className="text-sm text-red-700 mt-1">{rejectedRequest.reviewComment || t('board.dispatch.noReason')}</p>
              </div>
            </div>
          )}

          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-bold text-blue-900 mb-1">{project.title}</div>
              <div className="text-blue-800 flex gap-4 mt-2">
                <span><span className="opacity-70">{t('board.dispatch.pmInCharge')}</span> {pmUser?.name || t('common.unset')}</span>
                <span><span className="opacity-70">{t('board.dispatch.finalDeadline')}</span> {project.targetDate || project.deliveryDate || t('common.unset')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[var(--color-text-main)]">{t('board.dispatch.taskListTitle')}</h3>
              <button onClick={handleAddTask} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-sm font-semibold hover:bg-[var(--color-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                <Plus className="w-4 h-4" /> {t('board.dispatch.addTask')}
              </button>
            </div>

            {tasks.map((task, idx) => {
              const workload = task.assigneeId && task.startDate && task.dueDate && task.estimatedHours
                ? checkWorkerOverload(task.assigneeId, task.startDate, task.dueDate, task.estimatedHours)
                : { overloaded: false, offDays: false, avgDaily: 0 };
                
              return (
                <div key={idx} className={`bg-[var(--color-bg)]/50 p-4 rounded-lg border ${workload.overloaded || workload.offDays ? 'border-orange-300' : 'border-[var(--color-border)]'} relative space-y-4 transition-colors`}>
                  {tasks.length > 1 && (
                    <button onClick={() => handleRemoveTask(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.dispatch.taskName')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={task.title} 
                          onChange={(e) => handleUpdateTask(idx, 'title', e.target.value)}
                          className="w-full border rounded p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                          placeholder={t('board.dispatch.taskNamePlaceholder')}
                        />
                        <button
                          onClick={() => handleTranslate(idx)}
                          className="px-3 py-1 bg-[var(--color-bg-sub)] border border-[var(--color-border)] rounded hover:bg-gray-100 flex items-center gap-1 text-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        >
                          <Languages className="w-4 h-4" /> {t('board.dispatch.autoTranslate')}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.dispatch.assignee')}</label>
                      <select 
                        value={task.assigneeId} 
                        onChange={(e) => handleUpdateTask(idx, 'assigneeId', e.target.value)}
                        className="w-full border rounded p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      >
                        <option value="">{t('board.dispatch.assigneeSelect')}</option>
                        {Object.entries(activeUserGroups).map(([team, teamUsers]) => <optgroup key={team} label={team}>{teamUsers.map(u => <option key={u.id} value={u.id}>{u.name} · {u.jobTitle || u.position || u.role}</option>)}</optgroup>)}
                      </select>
                      {task.assigneeId && (() => { const selected = activeUsers.find((user) => user.id === task.assigneeId); return selected ? <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#2979a8] text-[10px] font-black text-white shadow-sm">{selected.name.slice(0, 1)}</span><span className="min-w-0"><strong className="block truncate text-[10px] text-[var(--color-text-main)]">{selected.name}</strong><span className="block truncate text-[9px] font-semibold text-[var(--color-text-sub)]">{selected.teamName || selected.subDepartmentName || selected.departmentName}</span></span></div> : null; })()}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.dispatch.priority')}</label>
                      <select 
                        value={task.priority} 
                        onChange={(e) => handleUpdateTask(idx, 'priority', e.target.value)}
                        className="w-full border rounded p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      >
                        <option value="URGENT">{t('board.dispatch.priUrgent')}</option>
                        <option value="HIGH">{t('board.dispatch.priHigh')}</option>
                        <option value="NORMAL">{t('board.dispatch.priNormal')}</option>
                        <option value="LOW">{t('board.dispatch.priLow')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.dispatch.estTime')}</label>
                      <input 
                        type="number" 
                        value={task.estimatedHours} 
                        onChange={(e) => handleUpdateTask(idx, 'estimatedHours', Number(e.target.value))}
                        className="w-full border rounded p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        min="1"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.dispatch.startDate')}</label>
                      <input 
                        type="date" 
                        value={task.startDate} 
                        onChange={(e) => handleUpdateTask(idx, 'startDate', e.target.value)}
                        className="w-full border rounded p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                    </div>
                    
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.dispatch.endDate')}</label>
                      <input 
                        type="date" 
                        value={task.dueDate} 
                        onChange={(e) => handleUpdateTask(idx, 'dueDate', e.target.value)}
                        className="w-full border rounded p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {(workload.overloaded || workload.offDays) && (
                    <div className="mt-2 text-xs p-2 bg-orange-50 text-orange-800 rounded border border-orange-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <div>
                        {workload.offDays && <span>{t('board.dispatch.warnOffDays')} </span>}
                        {workload.overloaded && <span>{t('board.dispatch.warnOverload').replace('{avgDaily}', String(workload.avgDaily))}</span>}
                      </div>
                    </div>
                  )}

                  {task.titleI18n && (
                    <div className="mt-2 text-xs p-2 bg-blue-50/50 rounded border border-blue-100/50">
                      <div className="text-gray-500 mb-1">
                        {t('board.dispatch.inputLanguage')} {task.titleI18n.originalLanguage === 'ko' ? t('board.dispatch.langKoDetected') : (task.titleI18n.originalLanguage === 'vi' ? t('board.dispatch.langViDetected') : t('board.dispatch.langUnknown'))}
                      </div>
                      {Object.entries(task.titleI18n.translations || {}).map(([lang, trans]) => (
                        <div key={lang} className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-blue-800">{lang.toUpperCase()}:</span>
                          <span className={trans.status === 'TRANSLATION_FAILED' || trans.status === 'PROVIDER_LIMIT_EXCEEDED' ? 'text-red-500' : 'text-gray-700'}>
                            {trans.text || trans.errorMessage || t('board.dispatch.transFailed')}
                          </span>
                          {trans.status === 'PROVIDER_LIMIT_EXCEEDED' && <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-[10px]">{t('board.dispatch.limitExceeded')}</span>}
                          {(trans.status === 'TRANSLATION_FAILED' || trans.status === 'PROVIDER_LIMIT_EXCEEDED') && (
                            <button onClick={() => handleTranslate(idx)} className="text-blue-500 hover:text-blue-700 ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg font-bold text-sm bg-[var(--color-surface)] hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold text-sm shadow-sm hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            {project.status === 'SCHEDULE_REJECTED' ? t('board.dispatch.submitRetry') : t('board.dispatch.submitNew')}
          </button>
        </div>
      </div>
    </div>
  );
};
