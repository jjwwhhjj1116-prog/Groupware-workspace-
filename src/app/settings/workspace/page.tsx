'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSettingStore } from '@/store/settingStore';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { Settings, Save, Edit2 } from 'lucide-react';
import { exportWorkspaceData, downloadJson, saveDraftToLocalStorage, validateImportData, applyImportData } from '@/lib/jsonHandoff';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export default function WorkspaceSettingsPage() {
  const { settings: translationSettings } = useTranslationStore();
  const t = useTranslation(translationSettings?.uiLanguage || 'ko');

  const { currentUser, appMode, setDataSourceMode } = useAuthStore();
  const { settings, updateSetting } = useSettingStore();
  const { batchCloseOverdueProjects, loadDummyProjects } = useProjectStore();
  const { loadDummyTasks } = useTaskStore();
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEditClick = (key: string, value: unknown) => {
    setEditingKey(key);
    setEditValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
  };

  const handleSave = (key: string, originalValue: unknown) => {
    try {
      let parsedValue: string | number | boolean | Record<string, string> = editValue;
      if (typeof originalValue === 'number') parsedValue = Number(editValue);
      if (typeof originalValue === 'boolean') parsedValue = editValue === 'true';
      if (typeof originalValue === 'object') parsedValue = JSON.parse(editValue);
      
      updateSetting(key, parsedValue, currentUser!.id);
      setEditingKey(null);
    } catch {
      alert(t('settings.workspace.errorInvalidFormat'));
    }
  };

  const handleSaveDraft = () => {
    saveDraftToLocalStorage();
    setSuccessMsg(t('settings.workspace.msgDraftSaved'));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExportJson = () => {
    const data = exportWorkspaceData();
    downloadJson(data, `workspace-export-${new Date().toISOString().slice(0,10)}.json`);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (validateImportData(json)) {
          applyImportData(json);
          setSuccessMsg(t('settings.workspace.msgImportSuccess'));
        } else {
          alert(t('settings.workspace.errorInvalidJson'));
        }
      } catch {
        alert(t('settings.workspace.errorParseFail'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const generateHandoffPackage = () => {
    const data = exportWorkspaceData();
    downloadJson(data, 'workspace-export.json');
    alert(t('settings.workspace.msgHandoffDesc'));
  };

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.workspace.authRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('settings.workspace.permissionDenied')}</div>;
  }

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {successMsg && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{successMsg}</div>}
      <div className="flex items-center gap-4 bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border">
        <div className="w-12 h-12 bg-gray-100 text-[var(--color-text-sub)] rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('settings.workspace.title')}</h1>
          <p className="text-sm text-[var(--color-text-sub)] mt-1">{t('settings.workspace.desc')}</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm overflow-hidden divide-y">
        {settings.map(setting => {
          const canEdit = setting.editableByRoles.includes(currentUser.role);
          const isEditing = editingKey === setting.key;
          
          return (
            <div key={setting.id} className="p-6 flex flex-col gap-4 hover:bg-[var(--color-bg)] transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded mb-2">
                    {setting.category}
                  </span>
                  <h3 className="font-bold text-[var(--color-text-main)]">{setting.key}</h3>
                  <p className="text-sm text-[var(--color-text-sub)] mt-1">{setting.description}</p>
                </div>
                {canEdit && !isEditing && (
                  <button onClick={() => handleEditClick(setting.key, setting.value)} className="p-2 text-[var(--color-text-sub)] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="bg-[var(--color-bg)] p-4 rounded-lg border border-[var(--color-border)] flex justify-between items-center">
                {isEditing ? (
                  <div className="w-full flex gap-3">
                    {typeof setting.value === 'object' ? (
                      <textarea 
                        value={editValue} onChange={e => setEditValue(e.target.value)}
                        className="w-full border rounded p-2 text-sm font-mono h-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                    ) : (
                      <input 
                        type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        className="w-full border rounded p-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                    )}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => handleSave(setting.key, setting.value)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                        <Save className="w-3 h-3" /> {t('settings.workspace.btnSave')}
                      </button>
                      <button onClick={() => setEditingKey(null)} className="px-3 py-1.5 border text-[var(--color-text-sub)] text-xs font-bold rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                        {t('settings.workspace.btnCancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex justify-between items-end">
                    <pre className="text-sm font-mono text-[var(--color-text-main)] whitespace-pre-wrap">
                      {typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : String(setting.value)}
                    </pre>
                    <div className="text-[10px] text-[var(--color-text-sub)] font-mono text-right shrink-0" suppressHydrationWarning>
                      {t('settings.workspace.lastUpdated')} {new Date(setting.updatedAt).toLocaleString()}<br/>
                      {t('settings.workspace.updatedBy')} {setting.updatedBy}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-red-200 mt-8">
        <h2 className="text-lg font-bold text-red-700 mb-2">{t('settings.workspace.dangerZoneTitle')}</h2>
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--color-text-sub)]">{t('settings.workspace.dangerZoneDesc')}</p>
          <button 
            onClick={() => {
              if (confirm(t('settings.workspace.dangerZoneConfirm'))) {
                batchCloseOverdueProjects(currentUser.id);
                setSuccessMsg(t('settings.workspace.dangerZoneSuccess'));
                setTimeout(() => setSuccessMsg(''), 3000);
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {t('settings.workspace.btnBatchClose')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-indigo-200 mt-8">
        <h2 className="text-lg font-bold text-indigo-700 mb-2">{t('settings.workspace.fixtureTitle')}</h2>
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--color-text-sub)]">{t('settings.workspace.fixtureDesc')}</p>
          <button 
            onClick={() => {
              if (appMode !== 'ADMIN_VALIDATION') {
                alert(t('settings.workspace.fixtureOnlyAdmin'));
                return;
              }
              if (confirm(t('settings.workspace.fixtureConfirm'))) {
                loadDummyProjects();
                loadDummyTasks();
                setDataSourceMode('DEMO_SEED_DATA');
                setSuccessMsg(t('settings.workspace.fixtureSuccess'));
                setTimeout(() => setSuccessMsg(''), 3000);
              }
            }}
            className={`px-4 py-2 rounded text-sm font-bold transition ${appMode === 'ADMIN_VALIDATION' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-[var(--color-text-sub)] cursor-not-allowed'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`}
          >
            {t('settings.workspace.btnInject')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border p-6 mt-8">
        <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">{t('settings.workspace.handoffTitle')}</h2>
        <p className="text-sm text-[var(--color-text-sub)] mb-6">
          {t('settings.workspace.handoffDesc1')}<br/>
          {t('settings.workspace.handoffDesc2_1')}<code>/json</code>{t('settings.workspace.handoffDesc2_2')}
        </p>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 border-b pb-6">
            <button onClick={handleSaveDraft} className="px-4 py-2 border border-[var(--color-border-strong)] rounded text-sm hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
              {t('settings.workspace.btnSaveDraft')}
            </button>
            <button onClick={handleExportJson} className="px-4 py-2 border border-blue-500 text-blue-600 rounded text-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
              {t('settings.workspace.btnExport')}
            </button>
            <label className="px-4 py-2 border border-[var(--color-border-strong)] rounded text-sm hover:bg-[var(--color-bg)] cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
              {t('settings.workspace.btnImport')}
              <input type="file" accept=".json" className="hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" onChange={handleImportJson} />
            </label>
            <button onClick={generateHandoffPackage} className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
              {t('settings.workspace.btnGeneratePackage')}
            </button>
          </div>
          
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded text-sm border border-yellow-200">
            <strong>{t('settings.workspace.noticeLabel')}</strong> {t('settings.workspace.noticeMsg1')}<code>/json</code>{t('settings.workspace.noticeMsg2')}
          </div>
        </div>
      </div>
    </div>
  );
}
