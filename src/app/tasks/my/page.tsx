'use client';
import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { TaskCard } from '@/types/models';
import { Badge } from '@/components/ui/Badge';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export default function MyTasksPage() {
  const { currentUser } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { tasks, requestTaskCompletion, reviewTaskCompletion } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState<TaskCard | null>(null);
  const [memo, setMemo] = useState('');

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;
  if (!['WORKER', 'PM'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('myTasks.noPermission')}</div>;
  }

  // Tasks assigned to me
  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id);

  // If PM, tasks I need to review
  const pendingReviews = tasks.filter(t => t.pmId === currentUser.id && t.completionStatus === 'PM_REVIEWING');

  const handleRequestCompletion = () => {
    if (selectedTask && memo) {
      requestTaskCompletion(selectedTask.id, memo);
      setSelectedTask(null);
      setMemo('');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DONE': return 'SUCCESS';
      case 'IN_PROGRESS': return 'INFO';
      case 'DELAYED': return 'ERROR';
      default: return 'DEFAULT';
    }
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-4">{t('myTasks.title')}</h1>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-sm border border-[var(--color-border)] overflow-hidden p-6">
          {myTasks.length === 0 ? (
            <p className="text-[var(--color-text-sub)] text-center">{t('myTasks.empty')}</p>
          ) : (
            <div className="space-y-4">
              {myTasks.map(task => (
                <div key={task.id} className="border border-[var(--color-border)] p-4 rounded-[var(--radius-card)] flex justify-between items-center hover:bg-[var(--color-bg)] transition-colors">
                  <div className="space-y-2">
                    <h3 className="font-bold text-[var(--color-text-main)] text-lg">{task.title}</h3>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                      <Badge variant={task.completionStatus ? 'WARNING' : 'DEFAULT'}>
                        {task.completionStatus || 'NOT_STARTED'}
                      </Badge>
                    </div>
                  </div>
                  {task.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => setSelectedTask(task)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-sm font-bold"
                    >
                      {t('myTasks.btnFinishReq')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {currentUser.role === 'PM' && (
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-4">{t('myTasks.pmTitle')}</h2>
          <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border overflow-hidden p-6">
            {pendingReviews.length === 0 ? (
              <p className="text-[var(--color-text-sub)] text-center">{t('myTasks.pmEmpty')}</p>
            ) : (
              <div className="space-y-4">
                {pendingReviews.map(task => (
                  <div key={task.id} className="border p-4 rounded-lg flex justify-between items-center hover:bg-[var(--color-bg)]">
                    <div>
                      <h3 className="font-bold text-[var(--color-text-main)]">{task.title}</h3>
                      <p className="text-sm text-[var(--color-text-sub)] max-w-lg truncate">{task.description}</p>
                    </div>
                    <div className="space-x-2 flex">
                      <button 
                        onClick={() => reviewTaskCompletion(task.id, true)}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                      >
                        {t('myTasks.btnApprove')}
                      </button>
                      <button 
                        onClick={() => reviewTaskCompletion(task.id, false)}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                      >
                        {t('myTasks.btnReject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <h3 className="text-lg font-bold">{t('myTasks.modalTitle', { title: selectedTask.title })}</h3>
            </div>
            <div className="px-6 py-6">
              <label htmlFor="task-memo-textarea" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('myTasks.modalMemoLbl')}</label>
              <textarea 
                id="task-memo-textarea"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" rows={4}
                value={memo} onChange={e => setMemo(e.target.value)}
                placeholder={t('myTasks.modalMemoPh')}
              />
            </div>
            <div className="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-2">
              <button 
                onClick={() => setSelectedTask(null)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-2 text-[var(--color-text-main)] bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
              >
                {t('myTasks.btnCancel')}
              </button>
              <button 
                onClick={handleRequestCompletion}
                disabled={!memo.trim()}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {t('myTasks.btnSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
