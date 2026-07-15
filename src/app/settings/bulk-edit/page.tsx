'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useBulkEditStore } from '@/store/bulkEditStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { Database, Edit, History, AlertTriangle } from 'lucide-react';

export default function BulkEditPage() {
  const { currentUser } = useAuthStore();
  const { sessions, createSession, updateSessionStatus } = useBulkEditStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings?.uiLanguage || 'ko');
  
  const [targetEntity, setTargetEntity] = useState<string>('PROJECT');
  const [targetField, setTargetField] = useState<string>('PM_ASSIGNMENT');
  const [newValue, setNewValue] = useState<string>('');
  
  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.personnel.authRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('settings.bulkEdit.permissionDenied')}</div>;
  }

  const activePreview = sessions.find(s => s.status === 'PREVIEW');

  const handleGeneratePreview = () => {
    if (!newValue) {
      alert(t('settings.bulkEdit.alertEmptyValue'));
      return;
    }
    
    // 모의 미리보기 생성
    createSession({
      targetEntityType: targetEntity,
      totalItems: targetEntity === 'PROJECT' ? 45 : 120,
      changedItems: Math.floor(Math.random() * 20) + 1,
      createdBy: currentUser.id,
    });
  };

  const handleApply = () => {
    if (!activePreview) return;
    const confirm = window.confirm(t('settings.bulkEdit.confirmApply'));
    if (confirm) {
      updateSessionStatus(activePreview.id, 'APPLIED', new Date().toISOString());
      alert(t('settings.bulkEdit.alertSuccess'));
      setNewValue('');
    }
  };

  const handleCancel = () => {
    if (!activePreview) return;
    updateSessionStatus(activePreview.id, 'CANCELLED');
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('settings.bulkEdit.title')}</h1>
          <p className="text-sm text-[var(--color-text-sub)] mt-1">{t('settings.bulkEdit.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-bold text-[var(--color-text-main)] border-b pb-2 flex items-center gap-2">
              <Edit className="w-4 h-4" /> {t('settings.bulkEdit.targetTitle')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('settings.bulkEdit.lblEntity')}</label>
                <select 
                  value={targetEntity} onChange={e => setTargetEntity(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  disabled={!!activePreview}
                >
                  <option value="PROJECT">{t('settings.bulkEdit.optProject')}</option>
                  <option value="PERSONNEL">{t('settings.bulkEdit.optPersonnel')}</option>
                  <option value="SCHEDULE">{t('settings.bulkEdit.optSchedule')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('settings.bulkEdit.lblField')}</label>
                <select 
                  value={targetField} onChange={e => setTargetField(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  disabled={!!activePreview}
                >
                  {targetEntity === 'PROJECT' && (
                    <>
                      <option value="PM_ASSIGNMENT">{t('settings.bulkEdit.optPm')}</option>
                      <option value="DEPARTMENT">{t('settings.bulkEdit.optDept')}</option>
                      <option value="DUE_DATE">{t('settings.bulkEdit.optDueDate')}</option>
                    </>
                  )}
                  {targetEntity === 'PERSONNEL' && (
                    <>
                      <option value="DEPARTMENT">{t('settings.bulkEdit.optMoveDept')}</option>
                      <option value="ROLE">{t('settings.bulkEdit.optRole')}</option>
                    </>
                  )}
                  {targetEntity === 'SCHEDULE' && (
                    <>
                      <option value="SCOPE_NORMALIZATION">{t('settings.bulkEdit.optScope')}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('settings.bulkEdit.lblNewValue')}</label>
                <input 
                  type="text" 
                  value={newValue} onChange={e => setNewValue(e.target.value)}
                  placeholder={t('settings.bulkEdit.phNewValue')}
                  className="w-full border rounded-lg p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  disabled={!!activePreview}
                />
              </div>
            </div>

            {!activePreview ? (
              <button 
                onClick={handleGeneratePreview}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full py-2.5 mt-2 bg-gray-800 hover:bg-black text-white rounded-lg font-bold shadow-sm transition-colors"
              >
                {t('settings.bulkEdit.btnPreview')}
              </button>
            ) : (
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={handleApply}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                >
                  {t('settings.bulkEdit.btnApply')}
                </button>
                <button 
                  onClick={handleCancel}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-[var(--color-text-main)] rounded-lg font-bold transition-colors"
                >
                  {t('settings.personnel.btnCancel')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3">
          {activePreview ? (
            <div className="bg-[var(--color-surface)] p-6 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-bold text-[var(--color-text-main)] border-b pb-2">{t('settings.bulkEdit.previewTitle')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-bg)] p-4 rounded-lg border text-center">
                  <div className="text-sm text-[var(--color-text-sub)] font-bold">{t('settings.bulkEdit.totalItems')}</div>
                  <div className="text-3xl font-extrabold text-[var(--color-text-main)] mt-1">{activePreview.totalItems}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                  <div className="text-sm text-emerald-600 font-bold">{t('settings.bulkEdit.changedItems')}</div>
                  <div className="text-3xl font-extrabold text-emerald-700 mt-1">{activePreview.changedItems}</div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 text-sm">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4" /> {t('settings.bulkEdit.warningTitle')}
                </div>
                {t('settings.bulkEdit.warningText1')}<strong>{t('settings.bulkEdit.warningText2')}</strong>{t('settings.bulkEdit.warningText3')}
                {t('settings.bulkEdit.warningText4')}
              </div>

              <div className="mt-4 p-4 border rounded-lg bg-[var(--color-bg)] text-sm text-[var(--color-text-sub)] text-center">
                {t('settings.bulkEdit.mockTable')}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] p-6 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-bold text-[var(--color-text-main)] border-b pb-2 flex items-center gap-2">
                <History className="w-4 h-4" /> {t('settings.bulkEdit.historyTitle')}
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sessions.filter(s => s.status !== 'PREVIEW').map(session => (
                  <div key={session.id} className="p-4 border rounded-lg flex justify-between items-center bg-[var(--color-bg)]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${session.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-[var(--color-text-main)]'}`}>
                          {session.status}
                        </span>
                        <span className="text-sm font-bold text-[var(--color-text-main)]">{t('settings.bulkEdit.lblEntity')}: {session.targetEntityType}</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-sub)]">
                        {t('settings.bulkEdit.lblTotalPrefix')} {session.totalItems}{t('settings.bulkEdit.lblTotalSuffix')} {session.changedItems}{t('settings.bulkEdit.lblChangedSuffix')}
                      </div>
                    </div>
                    <div className="text-xs text-right text-[var(--color-text-sub)]">
                      {new Date(session.createdAt).toLocaleString()} <br/>
                      {t('settings.bulkEdit.lblBy')} {session.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
