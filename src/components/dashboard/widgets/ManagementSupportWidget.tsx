import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useHrStore } from '@/store/hrStore';
import { Badge } from '@/components/ui/Badge';
import { Bell, Users, FileText } from 'lucide-react';
import { canViewHrDashboard } from '@/lib/permissions';

export const ManagementSupportWidget = () => {
  const { currentUser, users } = useAuthStore();
  const { notices } = useHrStore();
  const [activeTab, setActiveTab] = useState<'NOTICE' | 'HR' | 'DOCS'>('NOTICE');

  if (!currentUser) return null;

  // Role-based visibility
  const canViewHr = canViewHrDashboard(currentUser);
  
  // Calculate stats from authStore users
  const activeUsers = users.filter(u => u.employmentStatus === 'ACTIVE' || !u.employmentStatus);
  const newHires = activeUsers.filter(u => {
    if (!u.createdAt) return false;
    const createdAt = new Date(u.createdAt);
    const today = new Date();
    return createdAt.getMonth() === today.getMonth() && createdAt.getFullYear() === today.getFullYear();
  }).length;
  
  const resigned = users.filter(u => u.employmentStatus === 'RESIGNED').length;
  
  // Group by department
  const deptCounts: Record<string, number> = {};
  activeUsers.forEach(u => {
    if (u.departmentId) {
      deptCounts[u.departmentId] = (deptCounts[u.departmentId] || 0) + 1;
    }
  });

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg)]/50">
        <h3 className="font-bold text-[var(--color-text-main)] flex items-center gap-2">
          경영지원
        </h3>
        <div className="flex gap-1 text-xs">
          <button 
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'NOTICE' ? 'bg-[var(--color-primary)] text-white font-medium' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
            onClick={() => setActiveTab('NOTICE')}
          >
            <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> 공지사항</span>
          </button>
          {canViewHr && (
            <button 
              className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'HR' ? 'bg-[var(--color-primary)] text-white font-medium' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
              onClick={() => setActiveTab('HR')}
            >
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 조직/인사</span>
            </button>
          )}
          <button 
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'DOCS' ? 'bg-[var(--color-primary)] text-white font-medium' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'}`}
            onClick={() => setActiveTab('DOCS')}
          >
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 양식함</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '300px' }}>
        {activeTab === 'NOTICE' && (
          <ul className="space-y-2">
            {notices.length === 0 ? (
              <li className="text-center py-8 text-sm text-[var(--color-text-sub)]">등록된 공지사항이 없습니다.</li>
            ) : notices.map(notice => (
              <li key={notice.id} className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 mb-1">
                  {notice.isImportant && <Badge variant="WARNING">필독</Badge>}
                  <span className="font-semibold text-sm text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">{notice.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-sub)] mt-2">
                  <span>{notice.author}</span>
                  <span>{new Date(notice.date).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'HR' && canViewHr && (
          <div className="space-y-2">
            <div className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
              <h4 className="text-sm font-semibold mb-2">인사 변동 요약 (이번 달)</h4>
              <ul className="text-xs text-[var(--color-text-sub)] space-y-1">
                <li>신규 입사: {newHires}명</li>
                <li>퇴사: {resigned}명</li>
              </ul>
            </div>
            <div className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
              <h4 className="text-sm font-semibold mb-2">부서별 인원 현황</h4>
              {Object.keys(deptCounts).length === 0 ? (
                <div className="text-xs text-[var(--color-text-sub)]">부서 인원 데이터가 없습니다.</div>
              ) : (
                <ul className="text-xs text-[var(--color-text-sub)] space-y-1">
                  {Object.entries(deptCounts).map(([dept, count]) => (
                    <li key={dept}>{dept}: {count}명</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'DOCS' && (
          <ul className="space-y-2">
             <li className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors cursor-pointer flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-main)]">휴가 신청서 양식</span>
                <Badge variant="DEFAULT">다운로드</Badge>
             </li>
             <li className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors cursor-pointer flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-main)]">초과근무 신청서 양식</span>
                <Badge variant="DEFAULT">다운로드</Badge>
             </li>
          </ul>
        )}
      </div>
    </div>
  );
};
