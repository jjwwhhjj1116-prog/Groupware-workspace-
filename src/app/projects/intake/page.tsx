'use client';

import React, { useEffect, useState } from 'react';
import { Project, ProjectSourceType } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useProjectStore } from '@/store/projectStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTranslationStore } from '@/store/translationStore';
import { EstimateRequestWorkbench } from '@/components/intake/EstimateRequestWorkbench';

export default function IntakePage() {
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { projects, addProject, assignPM, updateProjectField } = useProjectStore();
  const { addNotification } = useNotificationStore();
  
  const [activeTab, setActiveTab] = useState<ProjectSourceType>('INTERNAL_DEVELOPMENT');
  const [showForm, setShowForm] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'URGENT'|'HIGH'|'NORMAL'|'LOW'>('NORMAL');
  const [newStartDate, setNewStartDate] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newClientName, setNewClientName] = useState(''); // for requester

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).has('requestId')) {
        setActiveTab('CLIENT_ORDER');
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // Authorization Check
  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('intake.noPermission')}</div>;
  }

  const isClient = activeTab === 'CLIENT_ORDER';
  // Allow PMs or Managers for external projects, and any active user for internal tasks
  const assignableUsers = users.filter(u => {
    if (u.isActive === false) return false;
    if (isClient) return ['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN'].includes(u.role) || u.organizationRank === 'PM';
    return true; // Anyone can be a person in charge for internal development tasks
  });

  const intakeProjects = projects.filter(p => (p.status === 'INTAKE_RECEIVED' || p.status === 'MANAGER_REVIEW') && (p.projectSourceType || 'CLIENT_ORDER') === activeTab);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    
    const payload: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'progress'> = {
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      departmentId: currentUser.departmentId,
      startDate: newStartDate || undefined,
      projectSourceType: activeTab,
    };

    if (activeTab === 'CLIENT_ORDER') {
      payload.deliveryDate = newDeliveryDate || undefined;
    } else {
      payload.targetDate = newTargetDate || undefined;
      payload.clientName = newClientName || undefined;
    }

    addProject(payload);
    console.log(`[AuditLog] Project created: ${newTitle} (Source: ${activeTab}) by ${currentUser?.name}`);
    
    setNewTitle('');
    setNewDesc('');
    setNewPriority('NORMAL');
    setNewStartDate('');
    setNewDeliveryDate('');
    setNewTargetDate('');
    setNewClientName('');
    setShowForm(false);
  };

  const handleAssignPM = (projectId: string, pmId: string) => {
    assignPM(projectId, pmId);
    console.log(`[AuditLog] PM ${pmId} assigned to project ${projectId} by ${currentUser?.name}`);
    
    addNotification({
      userId: pmId,
      type: 'PROJECT_ASSIGNED',
      title: '새 프로젝트 PM 배정',
      message: `새로운 프로젝트에 PM으로 배정되었습니다. 보드를 확인하세요.`,
      priority: 'HIGH',
      relatedProjectId: projectId,
    });
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* Tabs */}
      <div className="flex gap-4 mb-4 mt-8">
        <button
          onClick={() => { setActiveTab('INTERNAL_DEVELOPMENT'); setShowForm(false); }}
          className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-2 font-medium rounded-md transition-colors ${
            activeTab === 'INTERNAL_DEVELOPMENT'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[var(--color-bg-sub)] text-[var(--color-text-sub)] hover:bg-gray-200'
          }`}
        >
          {t('devTaskListManagement')}
        </button>
        <button
          onClick={() => { setActiveTab('CLIENT_ORDER'); setShowForm(false); }}
          className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-2 font-medium rounded-md transition-colors ${
            activeTab === 'CLIENT_ORDER'
              ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-md'
              : 'bg-[var(--color-bg-sub)] text-[var(--color-text-sub)] hover:bg-gray-200'
          }`}
        >
          {t('orderProjectManagement')}
        </button>
      </div>

      {isClient ? (
        <EstimateRequestWorkbench currentUser={currentUser} users={users} t={t} />
      ) : (
      <>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
          {isClient ? t('orderProjectManagement') : t('devTaskListManagement')}
        </h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold"
        >
          {showForm ? t('intake.form.cancel') : t('intake.alertNewProjectTitle')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border space-y-4">
          <div>
            <label htmlFor="intake-title" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('intake.form.title')}</label>
            <input 
              id="intake-title"
              type="text" required 
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border rounded-lg p-2"
            />
          </div>
          <div>
            <label htmlFor="intake-desc" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('intake.form.desc')}</label>
            <textarea 
              id="intake-desc"
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border rounded-lg p-2" rows={3}
              placeholder={t('intake.form.descPlaceholder')}
            />
          </div>
          {!isClient && (
            <div>
              <label htmlFor="intake-client" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('intake.form.client')}</label>
              <input 
                id="intake-client"
                type="text" 
                value={newClientName} onChange={e => setNewClientName(e.target.value)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border rounded-lg p-2"
                placeholder={t('intake.form.clientPlaceholder')}
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="intake-priority" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('intake.form.priority')}</label>
              <select 
                id="intake-priority"
                value={newPriority} onChange={e => setNewPriority(e.target.value as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW')}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border rounded-lg p-2"
              >
                <option value="LOW">{t('intake.form.priLow')}</option>
                <option value="NORMAL">{t('intake.form.priNormal')}</option>
                <option value="HIGH">{t('intake.form.priHigh')}</option>
                <option value="URGENT">{t('intake.form.priUrgent')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="intake-start" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('intake.form.startDate')}</label>
              <input 
                id="intake-start"
                type="date" 
                value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label htmlFor="intake-target" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{isClient ? t('intake.form.deliveryDate') : t('intake.form.targetDate')}</label>
              <input 
                id="intake-target"
                type="date" 
                value={isClient ? newDeliveryDate : newTargetDate} 
                onChange={e => isClient ? setNewDeliveryDate(e.target.value) : setNewTargetDate(e.target.value)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full border rounded-lg p-2"
              />
            </div>
          </div>
          <button type="submit" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full bg-indigo-600 text-white py-2 rounded-lg font-bold mt-4">
            {t('intake.form.submit')}
          </button>
        </form>
      )}

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b">
              <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('intake.form.title')}</th>
              <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('evaluation.colStatus')}</th>
              <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('intake.form.priority')}</th>
              {!isClient && <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('intake.form.client')}</th>}
              <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('intake.form.startDate')}</th>
              <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{isClient ? t('intake.form.deliveryDate') : t('intake.form.targetDate')}</th>
              <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('intake.form.pmLabel')}</th>
            </tr>
          </thead>
          <tbody>
            {intakeProjects.length === 0 ? (
              <tr>
                <td colSpan={isClient ? 6 : 7} className="p-6 text-center text-[var(--color-text-sub)]">
                  {t('projects.history.emptyPending')}
                </td>
              </tr>
            ) : (
              intakeProjects.map(p => (
                <tr key={p.id} className="border-b hover:bg-[var(--color-bg)]">
                  <td className="p-4 font-medium text-[var(--color-text-main)]">{p.title}</td>
                  <td className="p-4 text-sm text-[var(--color-text-sub)]">{p.status}</td>
                  <td className="p-4 text-sm text-[var(--color-text-sub)]">{p.priority}</td>
                  {!isClient && (
                    <td className="p-4 text-sm text-[var(--color-text-sub)]">
                      {p.clientName || '-'}
                    </td>
                  )}
                  <td className="p-4">
                    <input 
                      aria-label={`${p.title} ${t('intake.form.startDate')}`}
                      type="date" 
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border rounded p-2 text-sm"
                      value={p.startDate || ''}
                      onChange={(e) => updateProjectField(p.id, 'startDate', e.target.value)}
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      aria-label={`${p.title} ${isClient ? t('intake.form.deliveryDate') : t('intake.form.targetDate')}`}
                      type="date" 
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border rounded p-2 text-sm"
                      value={isClient ? (p.deliveryDate || '') : (p.targetDate || '')}
                      onChange={(e) => updateProjectField(p.id, isClient ? 'deliveryDate' : 'targetDate', e.target.value)}
                    />
                  </td>
                  <td className="p-4">
                    <select
                      aria-label={`${p.title} ${t('intake.form.pmLabel')}`}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border rounded px-2 py-1 text-sm bg-[var(--color-bg)]"
                      value={p.pmId || ''}
                      onChange={(e) => handleAssignPM(p.id, e.target.value)}
                    >
                      <option value="" disabled>{t('intake.form.pmUnassigned')}</option>
                      {assignableUsers.map(pm => (
                        <option key={pm.id} value={pm.id}>{getUserDisplayName(pm)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}

