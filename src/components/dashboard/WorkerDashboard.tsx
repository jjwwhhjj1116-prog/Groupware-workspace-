import React from 'react';
import { SummaryCard } from './SummaryCard';
import { CheckCircle, AlertTriangle, Clock, List, CheckSquare } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProjectStore } from '@/store/projectStore';
import { Badge } from '@/components/ui/Badge';
import { WorkManagementWidget } from './widgets/WorkManagementWidget';
import { ManagementSupportWidget } from './widgets/ManagementSupportWidget';

export const WorkerDashboard = ({ selectedMonth }: { selectedMonth: string | 'ALL' }) => {
  const { currentUser } = useAuthStore();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();

  const workerTasks = tasks.filter(t => {
    if (t.isDeleted || t.assigneeId !== currentUser?.id) return false;
    if (selectedMonth === 'ALL') return true;
    const p = projects.find(p => p.id === t.projectId);
    if (!p) return false;
    const dateStr = p.projectSourceType === 'INTERNAL_DEVELOPMENT' ? p.targetDate : p.deliveryDate;
    if (!dateStr) return false;
    return dateStr.startsWith(selectedMonth);
  });
  
  const completedTasksCount = workerTasks.filter(t => t.status === 'DONE').length;
  const pendingApprovalsCount = workerTasks.filter(t => t.approvalStatus === 'PENDING').length;
  const rejectedTasksCount = workerTasks.filter(t => t.approvalStatus === 'REJECTED').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard 
          title="내 작업" 
          value={workerTasks.length.toString()} 
          subtitle="할당된 전체 업무"
          icon={CheckSquare} 
          colorClass="bg-indigo-500" 
        />
        <SummaryCard 
          title="완료된 작업" 
          value={completedTasksCount.toString()} 
          subtitle="승인 완료된 업무"
          icon={CheckCircle} 
          colorClass="bg-green-500" 
        />
        <SummaryCard 
          title="승인 대기" 
          value={pendingApprovalsCount.toString()} 
          subtitle="PM 검토 대기 건"
          icon={Clock} 
          colorClass="bg-blue-500" 
        />
        <SummaryCard 
          title="수정 요청 (반려)" 
          value={rejectedTasksCount.toString()} 
          subtitle="재작업이 필요한 건"
          icon={AlertTriangle} 
          colorClass="bg-red-500" 
        />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--color-text-main)]">최근 할당된 작업</h2>
        </div>
        
        {workerTasks.length === 0 ? (
          <div className="p-6">
            <EmptyState 
              title="할당된 작업이 없습니다."
              description="PM이 업무를 할당하면 이곳에 표시됩니다."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">작업명</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">프로젝트</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">상태</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">마감일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {workerTasks.slice(0, 10).map(t => {
                  const project = projects.find(p => p.id === t.projectId);
                  return (
                    <tr key={t.id} className="hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-5 py-3 font-semibold text-[var(--color-text-main)]">{t.title}</td>
                      <td className="px-5 py-3 text-[var(--color-text-sub)]">{project?.title || '-'}</td>
                      <td className="px-5 py-3">
                        <Badge variant={t.status === 'DONE' ? 'SUCCESS' : t.status === 'IN_PROGRESS' ? 'INFO' : 'DEFAULT'}>
                          {t.status}
                        </Badge>
                        {t.approvalStatus === 'PENDING' && (
                          <Badge variant="WARNING" className="ml-2">승인 대기</Badge>
                        )}
                        {t.approvalStatus === 'REJECTED' && (
                          <Badge variant="ERROR" className="ml-2">반려</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${
                          t.dueDate && t.dueDate < new Date().toISOString().split('T')[0] && t.status !== 'DONE'
                            ? 'text-[var(--color-danger)]'
                            : 'text-[var(--color-text-sub)]'
                        }`}>
                          {t.dueDate || '미정'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="h-[350px]">
          <WorkManagementWidget />
        </div>
        <div className="h-[350px]">
          <ManagementSupportWidget />
        </div>
      </div>
    </div>
  );
};
