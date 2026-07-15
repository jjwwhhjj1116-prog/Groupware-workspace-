import React, { useState } from 'react';
import { TaskCard, ProgressUpdate } from '@/types/models';
import { useTaskStore } from '@/store/taskStore';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useAuthStore } from '@/store/authStore';
import { useApprovalStore } from '@/store/approvalStore';
import { X, CheckSquare, Clock, FileText, History, ListTodo, AlertCircle, CheckCircle2, ShieldAlert, Plus, CalendarClock, Zap, CalendarDays, DollarSign } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QcIssueModal } from '@/components/evaluation/QcIssueModal';
import { ScheduleRequestModal } from '@/components/board/ScheduleRequestModal';
import { calculateTaskHealthScore } from '@/lib/selectors';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { canEditTask } from '@/lib/permissions';
import { ProcessTemplateTab } from '@/components/board/ProcessTemplateTab';

interface TaskDetailModalProps {
  task: TaskCard;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [newProgress, setNewProgress] = useState(task.progress || 0);
  const [memo, setMemo] = useState('');
  const [newBlocker, setNewBlocker] = useState('');
  const [error, setError] = useState('');
  const [showQcModal, setShowQcModal] = useState(false);
  const [requestModalType, setRequestModalType] = useState<'OVERTIME_REQUEST' | 'DEADLINE_EXTENSION' | 'MANPOWER_SUPPORT' | 'SCHEDULE_REPLAN' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const currentUser = useAuthStore(state => state.currentUser);
  const users = useAuthStore(state => state.users);
  const { updateTaskProgress, progressUpdates, checklists, artifacts, blockers, addBlocker, resolveBlocker, workSegments, addWorkSegment, deleteWorkSegment, updateTaskBilling } = useTaskStore();
  const { qcIssues, appeals, addAppeal } = useEvaluationStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { addRequest } = useApprovalStore();

  const isEditable = currentUser ? canEditTask(currentUser, task) : false;

  const taskUpdates = progressUpdates.filter(u => u.taskId === task.id);
  const taskChecklists = checklists.filter(c => c.taskId === task.id);
  const taskArtifacts = artifacts.filter(a => a.taskId === task.id);
  const taskBlockers = blockers.filter(b => b.taskId === task.id);
  const taskQcIssues = qcIssues.filter(q => q.taskId === task.id);
  const taskSegments = workSegments.filter(w => w.taskId === task.id);

  const [newSegmentDesc, setNewSegmentDesc] = useState('');
  const [newSegmentStart, setNewSegmentStart] = useState('');
  const [newSegmentEnd, setNewSegmentEnd] = useState('');
  
  const healthScore = calculateTaskHealthScore(task, blockers, progressUpdates);
  const healthColor = healthScore >= 80 ? 'text-green-600 bg-green-50' 
                    : healthScore >= 50 ? 'text-yellow-600 bg-yellow-50' 
                    : 'text-red-600 bg-red-50';

  const handleUpdateProgress = async () => {
    const currentProgress = task.progress || 0;
    const diff = Math.abs(newProgress - currentProgress);
    
    if (diff >= 20 && memo.trim().length < 5) {
      setError(t('board.detail.alertProgressNote'));
      return;
    }

    if (!currentUser) return;

    let memoI18n = undefined;
    const sourceLang = settings.uiLanguage;
    const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
    
    if (settings.autoTranslateEnabled && memo.trim()) {
      try {
        const { executeTranslation, generateSourceHash } = await import('@/lib/translation/providers');
        const result = await executeTranslation({
          text: memo,
          sourceLang,
          targetLang
        });
        
        if (result.status === 'AUTO_TRANSLATED') {
          memoI18n = {
            originalLanguage: sourceLang,
            originalText: memo,
            translations: {
              [targetLang]: {
                text: result.text,
                status: result.status,
                provider: result.provider,
                translatedAt: new Date().toISOString(),
                sourceHash: generateSourceHash(memo, sourceLang, targetLang)
              }
            }
          };
        }
      } catch (err) {
        console.error('Translation failed', err);
      }
    }

    updateTaskProgress(task.id, newProgress, currentUser.id, memo, undefined, memoI18n);
    setMemo('');
    setError('');
    alert(t('board.detail.alertNoteSaved'));
  };

  const handleAddBlocker = () => {
    if (newBlocker.trim() === '') return;
    if (!currentUser) return;
    addBlocker({
      taskId: task.id,
      reporterId: currentUser.id,
      description: newBlocker
    });
    setNewBlocker('');
  };

  const handleAddSegment = () => {
    if (!newSegmentDesc || !newSegmentStart || !newSegmentEnd || !currentUser) return;
    
    // validate date range
    const tStart = task.startDate ? new Date(task.startDate).setHours(0,0,0,0) : 0;
    const tEnd = task.dueDate ? new Date(task.dueDate).setHours(23,59,59,999) : Infinity;
    const sStart = new Date(newSegmentStart).setHours(0,0,0,0);
    const sEnd = new Date(newSegmentEnd).setHours(23,59,59,999);
    
    if (tStart > 0 && sStart < tStart) {
      alert(t('board.detail.alertStartInvalid'));
      return;
    }
    if (tEnd !== Infinity && sEnd > tEnd) {
      alert(t('board.detail.alertEndInvalid'));
      return;
    }
    
    addWorkSegment({
      taskId: task.id,
      workerId: currentUser.id,
      description: newSegmentDesc,
      startDate: newSegmentStart,
      endDate: newSegmentEnd,
      progress: 0,
      status: 'RECORDED',
      isOvertime: false
    });
    setNewSegmentDesc('');
    setNewSegmentStart('');
    setNewSegmentEnd('');
  };

  const handleRequest = (type: 'OVERTIME_REQUEST' | 'DEADLINE_EXTENSION' | 'MANPOWER_SUPPORT' | 'SCHEDULE_REPLAN') => {
    setRequestModalType(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!currentUser) return;
    handleFiles(Array.from(e.dataTransfer.files));
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !e.target.files) return;
    handleFiles(Array.from(e.target.files));
  };

  const handleFiles = (files: File[]) => {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(t('board.detail.alertFileLarge', { name: file.name }));
        continue;
      }
      const allowedExtensions = /\.(pdf|jpe?g|png|xlsx|docx)$/i;
      if (!allowedExtensions.test(file.name)) {
        alert(t('board.detail.alertFileInvalid', { name: file.name }));
        continue;
      }
      
      const objectUrl = URL.createObjectURL(file);
      useTaskStore.getState().addArtifact({
        taskId: task.id,
        title: file.name,
        url: objectUrl,
        type: 'FILE',
        addedBy: currentUser!.id
      });
    }
  };

  const handleAppeal = (issueId: string) => {
    if (!currentUser) return;
    const reason = window.prompt(t('board.detail.promptAppeal'));
    if (!reason) return;
    
    addAppeal({
      evaluationPeriodId: 'current',
      userId: currentUser.id,
      evaluationResultId: 'dummy_result_id',
      targetIssueId: issueId,
      reason,
      requestedBy: currentUser.id,
    });
    alert(t('board.detail.alertAppealSubmitted'));
  };

  const tabs = [
    { id: 'OVERVIEW', label: t('board.detail.tabOverview'), icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
    { id: 'PROCESS_TEMPLATE', label: t('board.detail.tabProcess'), icon: <ListTodo className="w-4 h-4 text-blue-600" aria-hidden="true" /> },
    { id: 'WORK_SEGMENTS', label: t('board.detail.tabSegments'), icon: <ListTodo className="w-4 h-4" aria-hidden="true" /> },
    { id: 'PROGRESS', label: t('board.detail.tabProgress'), icon: <Clock className="w-4 h-4" aria-hidden="true" /> },
    { id: 'CHECKLIST', label: t('board.detail.tabChecklist'), icon: <CheckSquare className="w-4 h-4" aria-hidden="true" /> },
    { id: 'APPROVALS', label: t('board.detail.tabApprovals'), icon: <CalendarClock className="w-4 h-4" aria-hidden="true" /> },
    { id: 'ARTIFACTS', label: t('board.detail.tabArtifacts'), icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
    { id: 'EVALUATION', label: t('board.detail.tabEval'), icon: <ShieldAlert className="w-4 h-4" aria-hidden="true" /> },
    { id: 'BILLING', label: t('board.detail.tabBilling'), icon: <DollarSign className="w-4 h-4" aria-hidden="true" /> },
    { id: 'HISTORY', label: t('board.detail.tabHistory'), icon: <History className="w-4 h-4" aria-hidden="true" /> },
  ];

  const uiLang = settings.uiLanguage;
  let primaryTitle = task.title;
  let secondaryTitle = '';
  if (task.titleI18n) {
    if (uiLang === task.titleI18n.originalLanguage) {
      primaryTitle = task.titleI18n.originalText;
      const trans = task.titleI18n.translations?.[uiLang === 'ko' ? 'vi' : 'ko'];
      if (trans && trans.status !== 'TRANSLATION_FAILED') secondaryTitle = trans.text;
    } else {
      const trans = task.titleI18n.translations?.[uiLang];
      if (trans && trans.status !== 'TRANSLATION_FAILED') {
        primaryTitle = trans.text;
        secondaryTitle = task.titleI18n.originalText;
      } else {
        primaryTitle = task.titleI18n.originalText;
      }
    }
  }

  const assignee = users.find(u => u.id === task.assigneeId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl w-full max-w-[95vw] h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[var(--color-text-sub)] font-medium">Project {task.projectId} · {task.status}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${healthColor}`}>
                ♥ Health: {healthScore}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-main)]">{primaryTitle}</h2>
            {secondaryTitle && (
              <h3 className="text-sm font-semibold text-slate-500 mt-1">{secondaryTitle}</h3>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                {assignee ? assignee.name.charAt(0) : '?'}
              </div>
              <span className="font-medium text-[var(--color-text-main)]">
                {assignee ? assignee.name : t('board.assignee.unassigned')}
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-[var(--color-text-sub)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] px-4 bg-[var(--color-surface)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-[var(--color-bg)]/30 custom-scrollbar">
          
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-3">{t('board.detail.descTitle')}</h3>
                <p className="text-sm text-[var(--color-text-sub)] whitespace-pre-wrap">{task.description || t('board.detail.noDesc')}</p>
              </div>
              
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm flex gap-12">
                <div>
                  <div className="text-xs text-[var(--color-text-sub)] mb-1">{t('board.detail.deadlineLabel')}</div>
                  <div className="font-medium text-sm text-red-600">{task.dueDate || '-'}</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[var(--color-text-sub)] mb-2">{t('board.detail.progressLabel')}</div>
                  <ProgressBar progress={task.progress || 0} showLabel colorClass="bg-blue-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PROGRESS' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Update Form */}
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-4">{t('board.detail.updateTitle')}</h3>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--color-text-sub)] font-medium">{t('board.detail.newProgress')}</span>
                    <span className="font-bold text-blue-600">{newProgress}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" step="5"
                    value={newProgress}
                    onChange={(e) => setNewProgress(Number(e.target.value))}
                    disabled={!isEditable}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-[var(--color-text-sub)] font-medium mb-2">{t('board.detail.memoLabel')}</label>
                  <textarea 
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    disabled={!isEditable}
                    className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-colors ${error ? 'border-red-400' : 'border-[var(--color-border)]'} ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    rows={3}
                    placeholder={isEditable ? t('board.detail.memoPlaceholder') : t('board.detail.noAuth')}
                  />
                  {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={handleUpdateProgress}
                    disabled={!isEditable}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isEditable ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    {t('board.detail.saveRecord')}
                  </button>
                </div>
              </div>

              {/* Blockers */}
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-red-100 shadow-sm">
                <h3 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  {t('board.detail.blockersTitle')}
                </h3>
                
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={newBlocker}
                    onChange={(e) => setNewBlocker(e.target.value)}
                    disabled={!isEditable}
                    placeholder={isEditable ? t('board.detail.blockersPlaceholder') : t('board.detail.noAuth')}
                    className={`flex-1 p-2 text-sm border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <button 
                    onClick={handleAddBlocker}
                    disabled={!isEditable}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isEditable ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    {t('common.add')}
                  </button>
                </div>

                <div className="space-y-2">
                  {taskBlockers.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-sub)] text-center py-2">{t('board.detail.noBlockers')}</p>
                  ) : (
                    taskBlockers.map(blocker => (
                      <div key={blocker.id} className={`p-3 border rounded-lg flex justify-between items-start ${blocker.status === 'OPEN' ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50 opacity-60'}`}>
                        <div>
                          <p className={`text-sm ${blocker.status === 'OPEN' ? 'text-red-800 font-medium' : 'text-green-800 line-through'}`}>
                            {blocker.description}
                          </p>
                          <div className="text-xs mt-1 text-[var(--color-text-sub)]">
                            {blocker.reporterId} · {new Date(blocker.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {blocker.status === 'OPEN' && isEditable && (
                          <button 
                            onClick={() => currentUser && resolveBlocker(blocker.id, currentUser.id)}
                            className="text-xs bg-[var(--color-surface)] text-green-600 px-2 py-1 border border-green-200 rounded font-medium hover:bg-green-50"
                          >
                            {t('board.detail.resolvedBtn')}
                          </button>
                        )}
                        {blocker.status === 'RESOLVED' && (
                          <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> {t('board.detail.resolvedLabel')}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* History Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-main)] border-b pb-2">{t('board.detail.historyTitle', { count: taskUpdates.length.toString() })}</h3>
                {taskUpdates.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-sub)] text-center py-4">{t('board.detail.noHistory')}</p>
                ) : (
                  <div className="space-y-4">
                    {taskUpdates.map(update => (
                      <div key={update.id} className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--color-text-main)]">{update.authorId}</span>
                            <span className="text-xs text-[var(--color-text-sub)]">{new Date(update.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="text-xs font-bold bg-gray-100 text-[var(--color-text-sub)] px-2 py-1 rounded">
                            {update.progressBefore}% → <span className="text-blue-600">{update.progressAfter}%</span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--color-text-main)] whitespace-pre-wrap mt-2">{update.workSummary || t('board.detail.noContent')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'PROCESS_TEMPLATE' && (
            <ProcessTemplateTab task={task} isEditable={isEditable} />
          )}

          {activeTab === 'WORK_SEGMENTS' && (
            <div className="space-y-4">
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-4">{t('board.detail.subTaskTitle')}</h3>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="date" 
                    value={newSegmentStart} 
                    onChange={e => setNewSegmentStart(e.target.value)}
                    disabled={!isEditable}
                    className="border rounded p-2 text-sm w-32 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  />
                  <span className="self-center">~</span>
                  <input 
                    type="date" 
                    value={newSegmentEnd} 
                    onChange={e => setNewSegmentEnd(e.target.value)}
                    disabled={!isEditable}
                    className="border rounded p-2 text-sm w-32 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  />
                  <input 
                    type="text" 
                    value={newSegmentDesc} 
                    onChange={e => setNewSegmentDesc(e.target.value)} 
                    disabled={!isEditable}
                    placeholder={isEditable ? t('board.detail.subTaskPlaceholder') : t('board.detail.noAuth')}
                    className="flex-1 border rounded p-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  />
                  <button 
                    onClick={handleAddSegment} 
                    disabled={!isEditable}
                    className={`px-4 py-2 rounded text-sm font-bold ${isEditable ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    {t('common.add')}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {taskSegments.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-sub)] text-center py-4">{t('board.detail.noSubTasks')}</p>
                ) : (
                  taskSegments.map(seg => (
                    <div key={seg.id} className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] flex justify-between items-center shadow-sm">
                      <div>
                        <div className="text-sm font-semibold">{seg.description}</div>
                        <div className="text-xs text-[var(--color-text-sub)]">{seg.startDate} ~ {seg.endDate}</div>
                      </div>
                      {isEditable && (
                        <button onClick={() => deleteWorkSegment(seg.id)} className="text-red-500 text-xs hover:underline">
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'CHECKLIST' && (
            <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-4">{t('board.detail.tabChecklist')}</h3>
              {taskChecklists.length === 0 ? (
                <p className="text-sm text-[var(--color-text-sub)]">{t('board.detail.noChecklist')}</p>
              ) : (
                <div className="space-y-2">
                  {taskChecklists.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg)] rounded">
                      <input type="checkbox" checked={item.isCompleted} readOnly className="w-4 h-4 accent-blue-600" />
                      <span className={`text-sm ${item.isCompleted ? 'text-[var(--color-text-sub)] line-through' : 'text-[var(--color-text-main)]'}`}>
                        {item.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'APPROVALS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => handleRequest('OVERTIME_REQUEST')}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition flex flex-col items-center text-orange-700"
                >
                  <Clock className="w-8 h-8 mb-2" aria-hidden="true" />
                  <span className="font-bold text-center" dangerouslySetInnerHTML={{ __html: t('board.detail.reqOvertime') || '' }} />
                </button>
                
                <button 
                  onClick={() => handleRequest('DEADLINE_EXTENSION')}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition flex flex-col items-center text-red-700"
                >
                  <CalendarDays className="w-8 h-8 mb-2" aria-hidden="true" />
                  <span className="font-bold text-center" dangerouslySetInnerHTML={{ __html: t('board.detail.reqExt') || '' }} />
                </button>
                
                <button 
                  onClick={() => handleRequest('SCHEDULE_REPLAN')}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition flex flex-col items-center text-blue-700"
                >
                  <CalendarClock className="w-8 h-8 mb-2" aria-hidden="true" />
                  <span className="font-bold text-center" dangerouslySetInnerHTML={{ __html: t('board.detail.reqReplan') || '' }} />
                </button>

                <button 
                  onClick={() => handleRequest('MANPOWER_SUPPORT')}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition flex flex-col items-center text-purple-700"
                >
                  <Zap className="w-8 h-8 mb-2" aria-hidden="true" />
                  <span className="font-bold text-center" dangerouslySetInnerHTML={{ __html: t('board.detail.reqSupport') || '' }} />
                </button>
              </div>
              
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm mt-4">
                <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2">{t('board.detail.reqHistoryTitle')}</h3>
                <p className="text-sm text-[var(--color-text-sub)]">{t('board.detail.reqHistoryDesc')}</p>
              </div>
            </div>
          )}

          {activeTab === 'ARTIFACTS' && (
            <div className="space-y-4">
              <div 
                className={`bg-[var(--color-surface)] p-8 rounded-xl border-2 border-dashed transition-colors text-center ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-[var(--color-border-strong)] hover:border-gray-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex justify-center mb-3 text-[var(--color-text-sub)]">
                  <FileText className="w-10 h-10" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-[var(--color-text-main)] mb-1">{t('board.detail.fileDragLabel')}</h4>
                <p className="text-xs text-[var(--color-text-sub)] mb-4">{t('board.detail.fileDragDesc')}</p>
                <label className="bg-blue-50 text-blue-700 px-4 py-2 rounded font-semibold text-sm cursor-pointer hover:bg-blue-100 transition">
                  {t('board.detail.fileSelectBtn')}
                  <input type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" />
                </label>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-4">{t('board.detail.artifactTitle')}</h3>
              {taskArtifacts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-sub)]">{t('board.detail.noArtifacts')}</p>
              ) : (
                <div className="space-y-2">
                  {taskArtifacts.map(art => (
                    <div key={art.id} className="flex justify-between items-center p-3 border rounded-lg hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{art.type}</span>
                        <a href={art.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-text-main)] hover:text-blue-600 font-medium">
                          {art.title}
                        </a>
                      </div>
                      <span className="text-xs text-[var(--color-text-sub)]">{new Date(art.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'EVALUATION' && (
            <div className="space-y-6">
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-red-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" aria-hidden="true" /> {t('board.detail.qcTitle')}
                  </h4>
                  <button 
                    onClick={() => setShowQcModal(true)}
                    className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" /> {t('board.detail.qcAdd')}
                  </button>
                </div>
                
                {taskQcIssues.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-sub)] py-6 text-center">{t('board.detail.noQc')}</p>
                ) : (
                  <div className="space-y-3">
                    {taskQcIssues.map(issue => (
                      <div key={issue.id} className="p-4 border border-[var(--color-border)] rounded-lg hover:border-red-300 transition-colors relative bg-[var(--color-bg)]/50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">{issue.issueStage}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-[var(--color-text-main)]">{issue.severity}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">{t('board.detail.qcWeight', { weight: issue.weightPercent.toString() })}</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${issue.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-[var(--color-text-sub)]'}`}>
                            {issue.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-[var(--color-text-main)] text-sm">{issue.title}</h4>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 whitespace-pre-wrap">{issue.description}</p>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--color-border)]">
                          <span className="text-xs text-[var(--color-text-sub)]">{t('board.detail.qcReporter', { name: issue.reportedBy })}</span>
                          <div className="flex gap-2 items-center">
                            {appeals.filter(a => a.targetIssueId === issue.id).map(appeal => (
                              <span key={appeal.id} className={`text-xs px-2 py-0.5 rounded font-bold ${
                                appeal.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                appeal.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {t('board.detail.qcAppealStat', { status: appeal.status })}
                              </span>
                            ))}
                            {issue.assigneeId === currentUser?.id && !appeals.some(a => a.targetIssueId === issue.id && a.status === 'PENDING') && (
                              <button onClick={() => handleAppeal(issue.id)} className="text-xs text-indigo-600 font-bold hover:underline">
                                {t('board.detail.qcAppealBtn')}
                              </button>
                            )}
                            <span className="text-xs text-[var(--color-text-sub)] font-mono ml-2">{new Date(issue.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="text-center py-10 text-sm text-[var(--color-text-sub)]">
              {t('board.detail.auditPrep')}
            </div>
          )}

          {activeTab === 'BILLING' && (
            <div className="space-y-6">
              <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-teal-600" aria-hidden="true" /> {t('board.detail.billingTitle')}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isOutsourced" 
                      checked={task.isOutsourced || false}
                      onChange={(e) => updateTaskBilling(task.id, task.billingAmount || 0, task.billingStatus || 'PENDING', e.target.checked)}
                      disabled={!isEditable}
                      className="w-4 h-4 accent-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="isOutsourced" className="text-sm font-bold text-[var(--color-text-main)] cursor-pointer select-none">
                      {t('board.detail.billingTarget')}
                    </label>
                  </div>
                  
                  {task.isOutsourced && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-teal-50/50 rounded-lg border border-teal-100">
                      <div>
                        <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.detail.billingAmount')}</label>
                        <input 
                          type="number" 
                          value={task.billingAmount || 0}
                          onChange={(e) => updateTaskBilling(task.id, Number(e.target.value), task.billingStatus || 'PENDING', task.isOutsourced || false)}
                          disabled={!isEditable}
                          className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-100 outline-none disabled:bg-teal-100/50 disabled:cursor-not-allowed"
                          placeholder={t('board.detail.billingAmountPh')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.detail.billingStat')}</label>
                        <select
                          value={task.billingStatus || 'PENDING'}
                          onChange={(e) => updateTaskBilling(task.id, task.billingAmount || 0, e.target.value as 'PENDING' | 'INVOICED' | 'PAID', task.isOutsourced || false)}
                          disabled={!isEditable}
                          className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-100 outline-none disabled:bg-teal-100/50 disabled:cursor-not-allowed"
                        >
                          <option value="PENDING">{t('board.detail.billingPending')}</option>
                          <option value="INVOICED">{t('board.detail.billingInvoiced')}</option>
                          <option value="PAID">{t('board.detail.billingPaid')}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
      {showQcModal && <QcIssueModal task={task} onClose={() => setShowQcModal(false)} />}
      {requestModalType && (
        <ScheduleRequestModal 
          task={task} 
          type={requestModalType} 
          onClose={() => setRequestModalType(null)} 
        />
      )}
    </div>
  );
};
