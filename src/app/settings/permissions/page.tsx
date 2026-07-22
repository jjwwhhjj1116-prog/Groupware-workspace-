'use client';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { canViewProject, canViewEmployeeSchedule } from '@/lib/permissions';
import { ShieldCheck, UserCircle, LayoutDashboard, CalendarDays, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { PermissionSimulationResult } from '@/types/models';

export default function PermissionSimulatorPage() {
  const { settings: translationSettings } = useTranslationStore();
  const t = useTranslation(translationSettings?.uiLanguage || 'ko');

  const { currentUser, users: personnel, updateUser } = useAuthStore();
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [targetScreen, setTargetScreen] = useState<'PROJECT_BOARD' | 'SCHEDULE'>('PROJECT_BOARD');
  
  const [result, setResult] = useState<PermissionSimulationResult | null>(null);

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.personnel.authRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('settings.permissions.permissionDenied')}</div>;
  }

  const handleSimulate = () => {
    if (!selectedUserId) return;
    const simUser = personnel.find(p => p.id === selectedUserId);
    if (!simUser) return;

    const visibleProjects: string[] = [];
    const hiddenProjects: string[] = [];
    const visibleEmployees: string[] = [];
    const hiddenEmployees: string[] = [];
    const warnings: string[] = [];

    if (targetScreen === 'PROJECT_BOARD') {
      projects.forEach(p => {
        if (canViewProject(simUser, p)) {
          // Worker-specific logic check: Worker can view project but actually sees only their tasks
          if (simUser.role === 'WORKER') {
            const hasMyTasks = tasks.some(t => t.projectId === p.id && t.assigneeId === simUser.id);
            if (hasMyTasks) visibleProjects.push(p.title);
            else {
              hiddenProjects.push(p.title);
              warnings.push(`[${p.title}] ${t('settings.permissions.warnWorkerProject')}`);
            }
          } else {
            visibleProjects.push(p.title);
          }
        } else {
          hiddenProjects.push(p.title);
        }
      });
    } else if (targetScreen === 'SCHEDULE') {
      personnel.forEach(emp => {
        if (canViewEmployeeSchedule(simUser, emp)) {
          visibleEmployees.push(emp.name);
        } else {
          hiddenEmployees.push(emp.name);
        }
      });
      if (simUser.role === 'PM') warnings.push(t('settings.permissions.warnPmSchedule'));
    }

    setResult({
      id: `sim-${Date.now()}`,
      simulatedUserId: simUser.id,
      simulatedBy: currentUser.id,
      targetScreen,
      visibleProjects,
      hiddenProjects,
      visibleEmployees,
      hiddenEmployees,
      visibleSchedules: [],
      hiddenSchedules: [],
      warnings,
      createdAt: new Date().toISOString()
    });
  };

  const simUser = personnel.find(p => p.id === selectedUserId);
  const accessGrades = [
    { level: 5, name: 'L5 · 최고관리자', scope: '전사 데이터 · 관리자설정 · 권한 변경', color: 'text-purple-700 bg-purple-50' },
    { level: 4, name: 'L4 · 본부관리자', scope: '소속 본부 전체 · 결재 · 인력 배정', color: 'text-indigo-700 bg-indigo-50' },
    { level: 3, name: 'L3 · PM', scope: '담당 프로젝트 · 팀 일정 · 결재 요청', color: 'text-blue-700 bg-blue-50' },
    { level: 2, name: 'L2 · 실무자', scope: '배정 프로젝트 · 내 일정 · 내 문서', color: 'text-emerald-700 bg-emerald-50' },
    { level: 1, name: 'L1 · 제한열람', scope: '공지 · 조직도 · 허용 문서', color: 'text-slate-700 bg-slate-100' },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="cc-tactile-card p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#eef2ff] text-[#4e6fd8] rounded-2xl flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('settings.permissions.title')}</h1>
          <p className="text-sm text-[var(--color-text-sub)] mt-1">{t('settings.permissions.subtitle')}</p>
        </div>
      </div>

      <section className="cc-tactile-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#eb6300]" /><h2 className="text-sm font-black text-[var(--color-text-main)]">인력별 접근등급 설정</h2></div>
            <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-sub)]">등급은 메뉴 노출과 데이터 범위의 상한이며, 부서·담당 프로젝트 조건이 함께 적용됩니다.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe3f4] bg-[#f4f7ff] px-3 py-1.5 text-[10px] font-black text-[#40537a] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><LockKeyhole className="h-3.5 w-3.5 text-[#eb6300]" /> 관리자 전용</span>
        </div>
        <div className="grid gap-5 p-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[var(--cc-surface-2)] text-[var(--color-text-sub)]"><tr><th className="p-3 font-black">인력</th><th className="p-3 font-black">소속</th><th className="p-3 font-black">시스템 역할</th><th className="p-3 font-black">접근등급</th><th className="p-3 font-black">적용 범위</th></tr></thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {personnel.slice(0, 12).map((person) => {
                  const level = person.permissionLevel || (person.role === 'SUPER_ADMIN' ? 5 : person.role === 'DEPARTMENT_MANAGER' || person.role === 'SYSTEM_ADMIN' ? 4 : person.role === 'PM' ? 3 : 2);
                  const grade = accessGrades.find((item) => item.level === level) || accessGrades[3];
                  return (
                    <tr key={person.id} className="hover:bg-[#f7f9ff] dark:hover:bg-white/[.03]">
                      <td className="p-3"><strong className="block text-[var(--color-text-main)]">{person.displayName || person.name}</strong><span className="mt-0.5 block text-[9px] font-semibold text-[var(--color-text-sub)]">{person.employeeNumber || person.email || person.id}</span></td>
                      <td className="p-3 font-semibold text-[var(--color-text-sub)]">{person.companyId === 'VIET_QS' ? 'VIETQS' : 'CON-COST'} · {person.departmentName || person.departmentId}</td>
                      <td className="p-3 font-bold text-[var(--color-text-main)]">{person.systemRole || person.role}</td>
                      <td className="p-3"><select value={level} onChange={(event) => updateUser(person.id, { permissionLevel: Number(event.target.value) })} className="min-h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-black text-[var(--color-text-main)] outline-none focus:border-[#4e6fd8]">{accessGrades.map((item) => <option key={item.level} value={item.level}>{item.name}</option>)}</select></td>
                      <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${grade.color}`}>{grade.scope}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            {accessGrades.map((grade) => <div key={grade.level} className="rounded-2xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-3"><div className="flex items-center justify-between"><strong className="text-[11px] font-black text-[var(--color-text-main)]">{grade.name}</strong><span className={`rounded-full px-2 py-1 text-[9px] font-black ${grade.color}`}>LEVEL {grade.level}</span></div><p className="mt-2 text-[10px] font-semibold leading-5 text-[var(--color-text-sub)]">{grade.scope}</p></div>)}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="cc-tactile-card p-5 space-y-4">
            <h3 className="font-bold text-[var(--color-text-main)] border-b pb-2">{t('settings.permissions.simTitle')}</h3>
            
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('settings.permissions.lblUser')}</label>
              <select 
                value={selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="">{t('settings.permissions.optUser')}</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('settings.permissions.lblScreen')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTargetScreen('PROJECT_BOARD')}
                  className={`flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${targetScreen === 'PROJECT_BOARD' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> {t('settings.permissions.btnProject')}
                </button>
                <button 
                  onClick={() => setTargetScreen('SCHEDULE')}
                  className={`flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${targetScreen === 'SCHEDULE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
                >
                  <CalendarDays className="w-4 h-4" /> {t('settings.permissions.btnSchedule')}
                </button>
              </div>
            </div>

            <button 
              onClick={handleSimulate}
              disabled={!selectedUserId}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors disabled:bg-gray-300"
            >
              {t('settings.permissions.btnRun')}
            </button>
          </div>

          {simUser && (
            <div className="bg-[var(--color-bg)] p-5 rounded-xl border">
              <h4 className="text-xs font-bold text-[var(--color-text-sub)] mb-3">{t('settings.permissions.profileTitle')}</h4>
              <div className="flex items-center gap-3 mb-2">
                <UserCircle className="w-10 h-10 text-[var(--color-text-sub)]" />
                <div>
                  <div className="font-bold text-[var(--color-text-main)]">{simUser.name}</div>
                  <div className="text-xs text-[var(--color-text-sub)]">{simUser.role} · {simUser.departmentId}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!result ? (
            <div className="bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border-strong)] h-full min-h-[400px] flex flex-col items-center justify-center text-[var(--color-text-sub)]">
              <ShieldCheck className="w-12 h-12 mb-3 text-gray-300" />
              <p>{t('settings.permissions.emptySim')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-sm">
                  <h4 className="font-bold text-yellow-800 mb-2">{t('settings.permissions.warningTitle')}</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {result.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-green-100 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-green-700 mb-4 border-b border-green-50 pb-2">
                    <Eye className="w-5 h-5" /> {t('settings.permissions.visibleTitle')}
                  </h3>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                    {targetScreen === 'PROJECT_BOARD' ? (
                      result.visibleProjects.length ? result.visibleProjects.map((p, i) => (
                        <div key={i} className="text-sm px-2 py-1 bg-green-50 text-green-800 rounded">{p}</div>
                      )) : <div className="text-sm text-[var(--color-text-sub)]">{t('settings.permissions.noVisibleProject')}</div>
                    ) : (
                      result.visibleEmployees.length ? result.visibleEmployees.map((e, i) => (
                        <div key={i} className="text-sm px-2 py-1 bg-green-50 text-green-800 rounded">{e}</div>
                      )) : <div className="text-sm text-[var(--color-text-sub)]">{t('settings.permissions.noVisibleSchedule')}</div>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-red-100 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-red-700 mb-4 border-b border-red-50 pb-2">
                    <EyeOff className="w-5 h-5" /> {t('settings.permissions.hiddenTitle')}
                  </h3>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                    {targetScreen === 'PROJECT_BOARD' ? (
                      result.hiddenProjects.length ? result.hiddenProjects.map((p, i) => (
                        <div key={i} className="text-sm px-2 py-1 bg-red-50 text-red-800 rounded">{p}</div>
                      )) : <div className="text-sm text-[var(--color-text-sub)]">{t('settings.permissions.noHiddenProject')}</div>
                    ) : (
                      result.hiddenEmployees.length ? result.hiddenEmployees.map((e, i) => (
                        <div key={i} className="text-sm px-2 py-1 bg-red-50 text-red-800 rounded">{e}</div>
                      )) : <div className="text-sm text-[var(--color-text-sub)]">{t('settings.permissions.noHiddenSchedule')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
