import React from 'react';
import { SummaryCard } from './SummaryCard';
import { Briefcase, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { getDeliveryUrgencyBucket, getProjectOverallProgress } from '@/lib/selectors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { WorkManagementWidget } from './widgets/WorkManagementWidget';
import { ManagementSupportWidget } from './widgets/ManagementSupportWidget';

export const DepartmentManagerDashboard = ({ selectedMonth }: { selectedMonth: string | 'ALL' }) => {
  const { currentUser } = useAuthStore();
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  
  const [projectTypeFilter, setProjectTypeFilter] = React.useState<'INTERNAL_DEVELOPMENT' | 'CLIENT_ORDER'>('INTERNAL_DEVELOPMENT');

  const deptProjects = projects.filter(p => {
    if (p.isDeleted || p.archiveStatus === 'ARCHIVED' || p.departmentId !== currentUser?.departmentId) return false;
    if ((p.projectSourceType || 'CLIENT_ORDER') !== projectTypeFilter) return false;
    if (selectedMonth === 'ALL') return true;
    const dateStr = p.projectSourceType === 'INTERNAL_DEVELOPMENT' ? p.targetDate : p.deliveryDate;
    if (!dateStr) return false;
    return dateStr.startsWith(selectedMonth);
  });
  const deptTasks = tasks.filter(t => deptProjects.some(p => p.id === t.projectId));

  const urgentProjectsCount = deptProjects.filter(p => getDeliveryUrgencyBucket(p) === 'WITHIN_1_WEEK').length;
  const pendingApprovalsCount = deptTasks.filter(t => t.approvalStatus === 'PENDING').length;
  
  const delayedTasksCount = deptTasks.filter(t => {
    if (t.status === 'DONE') return false;
    if (!t.dueDate) return false;
    return t.dueDate < new Date().toISOString().split('T')[0];
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard 
          title="부서 전체 프로젝트" 
          value={deptProjects.length.toString()} 
          subtitle="부서 내 진행 중인 건"
          icon={Briefcase} 
          colorClass="bg-indigo-500" 
        />
        <SummaryCard 
          title="납품 경과 프로젝트" 
          value={urgentProjectsCount.toString()} 
          subtitle="납품일 1주일 이내 및 경과"
          icon={AlertTriangle} 
          colorClass="bg-red-500" 
        />
        <SummaryCard 
          title="부서원 결재 대기" 
          value={pendingApprovalsCount.toString()} 
          subtitle="부서장 승인 필요 문서"
          icon={CheckCircle} 
          colorClass="bg-blue-500" 
        />
        <SummaryCard 
          title="지연/충돌 업무" 
          value={delayedTasksCount.toString()} 
          subtitle="마감일 경과 또는 미처리 건"
          icon={Clock} 
          colorClass="bg-orange-500" 
        />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--color-text-main)]">월별 프로젝트 요약</h2>
          <select
            className="border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)] transition-colors"
            value={projectTypeFilter}
            onChange={(e) => setProjectTypeFilter(e.target.value as 'INTERNAL_DEVELOPMENT' | 'CLIENT_ORDER')}
          >
            <option value="INTERNAL_DEVELOPMENT">개발팀 업무</option>
            <option value="CLIENT_ORDER">수주 프로젝트</option>
          </select>
        </div>
        
        {deptProjects.length === 0 ? (
          <div className="p-6">
            <EmptyState 
              title="부서 내 진행 중인 프로젝트가 없습니다."
              description="프로젝트 보드에서 새 업무를 할당받거나 생성하세요."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">프로젝트명</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">구분</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">상태</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">공정률</th>
                  <th className="px-5 py-3 font-semibold text-[var(--color-text-sub)]">{projectTypeFilter === 'CLIENT_ORDER' ? '납품 예정일' : '목표 예정일'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {deptProjects.map(p => {
                  const progress = getProjectOverallProgress(p, tasks);
                  const urgency = getDeliveryUrgencyBucket(p);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-5 py-3 font-semibold text-[var(--color-text-main)]">{p.title}</td>
                      <td className="px-5 py-3">
                        <Badge variant={p.projectSourceType === 'CLIENT_ORDER' ? 'INFO' : 'DEFAULT'}>
                          {p.projectSourceType === 'CLIENT_ORDER' ? '수주' : '내부개발'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={p.status === 'COMPLETED' ? 'SUCCESS' : p.status === 'IN_PROGRESS' ? 'INFO' : 'DEFAULT'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-[var(--color-primary)] h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="font-semibold text-[var(--color-text-sub)] w-8">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${urgency === 'WITHIN_1_WEEK' ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-sub)]'}`}>
                          {p.deliveryDate || '미정'}
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
