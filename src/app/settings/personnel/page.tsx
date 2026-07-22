"use client";

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { Users, Save, Download, Plus, Edit2, Trash2 } from 'lucide-react';
import { PersonnelCard } from '@/types/models';


export default function PersonnelManagementPage() {
  const { settings: translationSettings } = useTranslationStore();
  const t = useTranslation(translationSettings?.uiLanguage || 'ko');

  const { currentUser, users, addUser, updateUser, deactivateUser } = useAuthStore();
  const personnel = users;
  
  const [editingUser, setEditingUser] = useState<Partial<PersonnelCard> | null>(null);
  
  const handleAddUser = () => {
    setEditingUser({
      name: '',
      displayName: '',
      companyId: 'CON_COST',
      departmentId: '',
      role: 'WORKER',
      systemRole: 'WORKER',
      employmentStatus: 'ACTIVE',
      isActive: true,
    });
  };
  
  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.personnel.authRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('settings.personnel.permissionDenied')}</div>;
  }



  const handleEdit = (u: PersonnelCard) => {
    setEditingUser(u);
  };

  const handleExport = () => {
    const data = {
      schemaVersion: "1.0.0",
      personnel
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel-cards.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('settings.personnel.title')}</h1>
            <p className="text-sm text-[var(--color-text-sub)] mt-1">{t('settings.personnel.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddUser} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            {t('settings.personnel.btnAdd')}
          </button>
          <button onClick={handleExport} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-2 px-4 py-2 border border-[var(--color-border-strong)] rounded text-sm hover:bg-[var(--color-bg)]">
            <Download className="w-4 h-4" />
            {t('settings.personnel.btnExport')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border p-6 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[var(--color-bg)] text-[var(--color-text-sub)]">
            <tr>
              <th className="p-3">{t('settings.personnel.thEmpNo')}</th>
              <th className="p-3">{t('settings.personnel.thName')}</th>
              <th className="p-3">{t('settings.personnel.thAffiliation')}</th>
              <th className="p-3">{t('settings.personnel.thRank')}</th>
              <th className="p-3">{t('settings.personnel.thSysRole')}</th>
              <th className="p-3">{t('settings.personnel.thDeputy')}</th>
              <th className="p-3">{t('settings.personnel.thStatus')}</th>
              <th className="p-3">{t('settings.personnel.thAction')}</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map(user => (
              <tr key={user.id} className="border-b hover:bg-[var(--color-bg)]">
                <td className="p-3">{user.employeeNumber || '-'}</td>
                <td className="p-3 font-bold">{user.displayName || user.name}</td>
                <td className="p-3 text-[var(--color-text-sub)]">
                  {user.companyId === 'CON_COST' ? 'CON-COST' : 'Viet_QS'} / {user.departmentId}
                </td>
                <td className="p-3">{user.organizationRank || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    user.systemRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                    user.systemRole === 'PM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-[var(--color-text-main)]'
                  }`}>
                    {user.systemRole || user.role}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={user.deputyApproverId || ''}
                    onChange={(e) => updateUser(user.id, { deputyApproverId: e.target.value })}
                    className="border rounded p-1 text-xs outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <option value="">{t('settings.personnel.optNoDeputy')}</option>
                    {users.filter(u => u.id !== user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.displayName || u.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${user.employmentStatus === 'ACTIVE' || user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.employmentStatus || (user.isActive ? 'ACTIVE' : 'INACTIVE')}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => handleEdit(user)} className="p-1 text-gray-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" title={t('settings.personnel.ttEdit')}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deactivateUser(user.id)} className="p-1 text-gray-500 hover:text-red-600 ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" title={t('settings.personnel.ttDeactivate')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <h2 className="text-lg font-bold">{editingUser.id ? t('settings.personnel.modalEditTitle') : t('settings.personnel.modalAddTitle')}</h2>
            </div>
            <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.lblName')}</label>
                <input 
                  type="text" 
                  value={editingUser.displayName || editingUser.name || ''} 
                  onChange={e => setEditingUser({...editingUser, displayName: e.target.value})}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.lblCompany')}</label>
                <select 
                  value={editingUser.companyId || ''} 
                  onChange={e => setEditingUser({...editingUser, companyId: e.target.value as PersonnelCard['companyId']})}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="">{t('settings.personnel.optNone')}</option>
                  <option value="CON_COST">{t('settings.personnel.optConCost')}</option>
                  <option value="VIET_QS">{t('settings.personnel.optVietQs')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.lblDept')}</label>
                <select 
                  value={editingUser.departmentId || ''} 
                  onChange={e => setEditingUser({...editingUser, departmentId: e.target.value})}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="">{t('settings.personnel.optNone')}</option>
                  <option value="FINISH">{t('settings.personnel.optFinishing')}</option>
                  <option value="STRUCTURE">{t('settings.personnel.optStructure')}</option>
                  <option value="CIVIL">{t('settings.personnel.optCivil')}</option>
                  <option value="DEVELOP">{t('settings.personnel.optDevelop')}</option>
                </select>
              </div>
              {editingUser.companyId === 'VIET_QS' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.lblSubDept')}</label>
                  <select 
                    value={editingUser.subDepartmentId || ''} 
                    onChange={e => setEditingUser({...editingUser, subDepartmentId: e.target.value})}
                    className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <option value="">{t('settings.personnel.optNone')}</option>
                    <optgroup label={t('settings.personnel.grpFinishing')}>
                      <option value="INTERNAL_1">Internal1</option>
                      <option value="INTERNAL_2">Internal2</option>
                      <option value="INTERNAL_3">Internal3</option>
                      <option value="EXTERNAL">External</option>
                      <option value="PARTITION_OPENING">Partition & Opening</option>
                    </optgroup>
                    <optgroup label={t('settings.personnel.grpStructure')}>
                      <option value="VERTICAL">Vertical</option>
                      <option value="HORIZONTAL_FOUNDATION">Horizontal & Foundation</option>
                    </optgroup>
                    <optgroup label={t('settings.personnel.grpCivil')}>
                      <option value="CIVIL_SUB">Civil</option>
                    </optgroup>
                    <optgroup label={t('settings.personnel.grpDevelop')}>
                      <option value="DEVELOP_SUB">Develop</option>
                    </optgroup>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.thRank')}</label>
                <select 
                  value={editingUser.organizationRank || ''} 
                  onChange={e => setEditingUser({...editingUser, organizationRank: e.target.value as PersonnelCard['organizationRank']})}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="">{t('settings.personnel.optNone')}</option>
                  <option value="CEO">CEO</option>
                  <option value="COO">COO</option>
                  <option value="VICE_PRESIDENT">Vice President</option>
                  <option value="MANAGER">{t('settings.personnel.optManager')}</option>
                  <option value="PM">{t('settings.personnel.optPm')}</option>
                  <option value="TEAM_LEADER">{t('settings.personnel.optTeamLeader')}</option>
                  <option value="DEPUTY_TEAM_LEADER">{t('settings.personnel.optDeputyLeader')}</option>
                  <option value="STAFF">{t('settings.personnel.optStaff')}</option>
                  <option value="TRAINEE">{t('settings.personnel.optTrainee')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.thSysRole')}</label>
                <select 
                  value={editingUser.systemRole || editingUser.role} 
                  onChange={e => setEditingUser({...editingUser, systemRole: e.target.value as PersonnelCard['systemRole'], role: e.target.value as PersonnelCard['role']})}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                  <option value="DEPARTMENT_MANAGER">DEPARTMENT_MANAGER</option>
                  <option value="PM">PM</option>
                  <option value="WORKER">WORKER</option>
                  <option value="EVALUATION_ADMIN">EVALUATION_ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">접근 제한등급</label>
                <select
                  value={editingUser.permissionLevel || (editingUser.role === 'SUPER_ADMIN' ? 5 : editingUser.role === 'DEPARTMENT_MANAGER' || editingUser.role === 'SYSTEM_ADMIN' ? 4 : editingUser.role === 'PM' ? 3 : 2)}
                  onChange={e => setEditingUser({...editingUser, permissionLevel: Number(e.target.value)})}
                  className="w-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value={5}>L5 · 최고관리자 (전사/관리자설정)</option>
                  <option value={4}>L4 · 본부관리자 (소속 본부 전체)</option>
                  <option value={3}>L3 · PM (담당 프로젝트/팀)</option>
                  <option value={2}>L2 · 실무자 (배정 업무/개인)</option>
                  <option value={1}>L1 · 제한열람 (공지/조직도)</option>
                </select>
                <p className="mt-1.5 text-[10px] font-semibold text-[var(--color-text-sub)]">등급은 메뉴와 데이터 범위의 상한으로 적용됩니다.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">{t('settings.personnel.thStatus')}</label>
                <select 
                  value={editingUser.employmentStatus || (editingUser.isActive ? 'ACTIVE' : 'INACTIVE')} 
                  onChange={e => setEditingUser({...editingUser, employmentStatus: e.target.value})}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="ACTIVE">{t('settings.personnel.optActive')}</option>
                  <option value="ON_LEAVE">{t('settings.personnel.optLeave')}</option>
                  <option value="RESIGNED">{t('settings.personnel.optResigned')}</option>
                  <option value="INACTIVE">{t('settings.personnel.optInactive')}</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-2">
              <button 
                onClick={() => setEditingUser(null)} 
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-2 border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-main)] rounded-lg text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
              >
                {t('settings.personnel.btnCancel')}
              </button>
              <button 
                onClick={() => {
                  if (!editingUser.departmentId) {
                    alert(t('settings.personnel.alertDeptRequired'));
                    return;
                  }
                  const updatedUser = { ...editingUser };
                  if (updatedUser.companyId === 'CON_COST') {
                    updatedUser.subDepartmentId = undefined; // CON_COST shouldn't have sub dept
                  }
                  if (
                    (updatedUser.systemRole === 'SUPER_ADMIN' || updatedUser.role === 'SUPER_ADMIN') && 
                    currentUser.role !== 'SUPER_ADMIN'
                  ) {
                    alert(t('settings.personnel.alertSuperAdmin'));
                    return;
                  }
                  if (updatedUser.id) {
                    updateUser(updatedUser.id, updatedUser as PersonnelCard);
                  } else {
                    addUser(updatedUser as Omit<PersonnelCard, 'id'>);
                  }
                  setEditingUser(null);
                }} 
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" /> {t('settings.personnel.btnSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
