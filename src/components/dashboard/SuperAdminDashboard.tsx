import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  ShieldAlert,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { getDeliveryUrgencyBucket } from '@/lib/selectors';
import { getUserDisplayName } from '@/lib/localization';
import { ManagementSupportWidget } from './widgets/ManagementSupportWidget';

type ProjectTypeFilter = 'INTERNAL_DEVELOPMENT' | 'CLIENT_ORDER';

const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;

export const SuperAdminDashboard = ({ selectedMonth }: { selectedMonth: string | 'ALL' }) => {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { users } = useAuthStore();
  const { settings } = useTranslationStore();
  const [projectTypeFilter, setProjectTypeFilter] = React.useState<ProjectTypeFilter>('INTERNAL_DEVELOPMENT');
  const language = settings.uiLanguage;

  const copy = language === 'vi' ? {
    operations: 'Tình hình vận hành hôm nay', pipeline: 'Toàn bộ quy trình', queue: 'Hàng đợi ưu tiên',
    risk: 'Phê duyệt · Rủi ro', monthly: 'Tổng quan dự án theo tháng', management: 'Hỗ trợ quản lý',
    active: 'Dự án đang chạy', overdue: 'Dự án sát hạn', approvals: 'Chờ phê duyệt', delayed: 'Công việc trễ/xung đột',
    updated: 'Cập nhật theo dữ liệu hiện tại', all: 'Xem tất cả', urgent: 'Khẩn cấp', today: 'Hôm nay', week: 'Tuần này',
    noTasks: 'Không có công việc ưu tiên.', noRisk: 'Không có rủi ro khẩn cấp.', projectTask: 'Dự án / Công việc',
    department: 'Bộ phận', assignee: 'Phụ trách', due: 'Hạn', progress: 'Tiến độ', status: 'Trạng thái',
    planned: 'Kế hoạch', completed: 'Hoàn thành', internal: 'Nội bộ', order: 'Đơn hàng',
  } : {
    operations: '오늘의 운영 현황', pipeline: '전체 파이프라인 현황', queue: '우선 작업 큐',
    risk: '승인 · 리스크', monthly: '월별 프로젝트 요약', management: '경영지원',
    active: '진행 중 프로젝트', overdue: '납품 임박 프로젝트', approvals: '결재/승인 대기', delayed: '지연/충돌 업무',
    updated: '현재 데이터 기준 업데이트', all: '전체 보기', urgent: '긴급 결재', today: '오늘 마감', week: '이번 주 마감',
    noTasks: '우선 처리할 작업이 없습니다.', noRisk: '긴급하게 확인할 리스크가 없습니다.', projectTask: '프로젝트 / 작업명',
    department: '부서', assignee: '담당자', due: '기한', progress: '진행률', status: '상태',
    planned: '계획', completed: '완료', internal: '내부개발', order: '외부 수주',
  };

  const visibleProjects = React.useMemo(() => projects.filter((project) => {
    if (project.isDeleted || project.archiveStatus === 'ARCHIVED') return false;
    if ((project.projectSourceType || 'CLIENT_ORDER') !== projectTypeFilter) return false;
    if (selectedMonth === 'ALL') return true;
    const date = project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? project.targetDate : project.deliveryDate;
    return Boolean(date?.startsWith(selectedMonth));
  }), [projects, projectTypeFilter, selectedMonth]);

  const today = new Date().toISOString().slice(0, 10);
  const activeProjectIds = new Set(visibleProjects.map((project) => project.id));
  const visibleTasks = tasks.filter((task) => !task.isDeleted && activeProjectIds.has(task.projectId));
  const urgentProjects = visibleProjects.filter((project) => getDeliveryUrgencyBucket(project) === 'WITHIN_1_WEEK');
  const pendingApprovals = visibleTasks.filter((task) => task.approvalStatus === 'PENDING');
  const delayedTasks = visibleTasks.filter((task) => task.status !== 'DONE' && Boolean(task.dueDate && task.dueDate < today));

  const priorityTasks = [...visibleTasks]
    .filter((task) => task.status !== 'DONE')
    .sort((a, b) => {
      const overdueA = a.dueDate && a.dueDate < today ? -1 : 0;
      const overdueB = b.dueDate && b.dueDate < today ? -1 : 0;
      return overdueA - overdueB || priorityRank[a.priority] - priorityRank[b.priority] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    })
    .slice(0, 5);

  const pipeline = [
    { label: language === 'vi' ? 'Tiếp nhận' : '접수', count: visibleProjects.filter((p) => ['INTAKE_RECEIVED', 'MANAGER_REVIEW'].includes(p.status)).length },
    { label: language === 'vi' ? 'Phân PM' : 'PM 배정', count: visibleProjects.filter((p) => p.status === 'PM_ASSIGNED').length },
    { label: language === 'vi' ? 'Lịch PM' : 'PM 일정', count: visibleProjects.filter((p) => p.status.startsWith('SCHEDULE_')).length },
    { label: language === 'vi' ? 'Thực hiện' : '작업', count: visibleProjects.filter((p) => p.status === 'IN_PROGRESS').length },
    { label: 'QC', count: visibleProjects.filter((p) => p.status === 'QA_REVIEW').length },
    { label: language === 'vi' ? 'Bàn giao' : '납품', count: visibleProjects.filter((p) => p.status === 'COMPLETED').length },
  ];
  const bottleneck = pipeline.reduce((best, item) => item.count > best.count ? item : best, pipeline[0]);

  const chartData = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 4 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthProjects = projects.filter((project) => {
        const projectDate = project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? project.targetDate : project.deliveryDate;
        return !project.isDeleted && projectDate?.startsWith(key);
      });
      return {
        label: language === 'vi' ? `T${date.getMonth() + 1}` : `${date.getMonth() + 1}월`,
        planned: monthProjects.length,
        completed: monthProjects.filter((project) => project.status === 'COMPLETED' || project.archiveStatus === 'ARCHIVED').length,
      };
    });
  }, [projects, language]);
  const chartMax = Math.max(1, ...chartData.map((item) => item.planned));

  const statusLabel = (status: string) => ({
    TODO: language === 'vi' ? 'Chờ' : '대기', READY: language === 'vi' ? 'Sẵn sàng' : '준비',
    IN_PROGRESS: language === 'vi' ? 'Đang làm' : '작업중', REVIEW: language === 'vi' ? 'Đánh giá' : '검토중',
    HOLD: language === 'vi' ? 'Tạm dừng' : '보류', REJECTED: language === 'vi' ? 'Từ chối' : '반려',
  }[status] || status);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]" aria-label={copy.operations}>
        <div className="cc-ops-panel">
          <div className="cc-section-heading">
            <span className="cc-heading-mark bg-[var(--cc-orange-500)]" />
            <h2>{copy.operations}</h2>
            <span className="ml-auto text-[11px] font-semibold text-[var(--color-text-sub)]">{copy.updated}</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] sm:grid-cols-4 sm:divide-y-0">
            {[
              [copy.active, visibleProjects.length, 'text-[var(--color-text-main)]'],
              [copy.overdue, urgentProjects.length, 'text-[var(--cc-danger-700)]'],
              [copy.approvals, pendingApprovals.length, 'text-[var(--cc-orange-700)]'],
              [copy.delayed, delayedTasks.length, 'text-[var(--cc-warning-700)]'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="min-w-0 px-4 py-4">
                <p className="truncate text-[11px] font-bold tracking-[.03em] text-[var(--color-text-sub)]">{label}</p>
                <p className={`mt-2 font-mono text-[30px] font-black leading-none tabular-nums ${tone}`}>{value}</p>
                <div className="mt-3 h-0.5 w-full bg-[var(--cc-surface-3)]"><span className="block h-full w-2/5 bg-[var(--cc-orange-500)]" /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="cc-ops-panel">
          <div className="cc-section-heading">
            <span className="cc-heading-mark bg-slate-600" />
            <h2>{copy.pipeline}</h2>
          </div>
          <div className="grid grid-cols-3 gap-px bg-[var(--color-border)] sm:grid-cols-6">
            {pipeline.map((item) => {
              const isBottleneck = item === bottleneck && item.count > 0;
              return <div key={item.label} className={`relative bg-[var(--color-surface)] px-2 py-4 text-center ${isBottleneck ? 'shadow-[inset_0_-3px_0_var(--cc-orange-500)]' : ''}`}>
                {isBottleneck && <span className="absolute inset-x-1 top-0 bg-[var(--cc-orange-600)] px-1 py-0.5 text-[8px] font-black tracking-wider text-white">BOTTLENECK</span>}
                <p className="mt-1 text-[11px] font-bold text-[var(--color-text-sub)]">{item.label}</p>
                <p className={`mt-1 font-mono text-xl font-black tabular-nums ${isBottleneck ? 'text-[var(--cc-orange-700)]' : 'text-[var(--color-text-main)]'}`}>{item.count}</p>
              </div>;
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,.88fr)]">
        <div className="cc-ops-panel min-w-0">
          <div className="cc-section-heading">
            <span className="cc-heading-mark bg-[var(--cc-ink-900)]" />
            <h2>{copy.queue}</h2>
            <Link href="/tasks/my" className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[var(--cc-orange-700)] hover:bg-[var(--cc-orange-50)]">{copy.all}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead className="border-y border-[var(--color-border)] bg-[var(--cc-surface-2)] text-[10px] uppercase tracking-wider text-[var(--color-text-sub)]">
                <tr><th className="px-4 py-2">#</th><th className="px-3 py-2">{copy.projectTask}</th><th className="px-3 py-2">{copy.department}</th><th className="px-3 py-2">{copy.assignee}</th><th className="px-3 py-2">{copy.due}</th><th className="px-3 py-2">{copy.progress}</th><th className="px-3 py-2">{copy.status}</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {priorityTasks.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-sub)]">{copy.noTasks}</td></tr> : priorityTasks.map((task) => {
                  const project = visibleProjects.find((item) => item.id === task.projectId);
                  const assignee = users.find((user) => user.id === task.assigneeId);
                  const isOverdue = Boolean(task.dueDate && task.dueDate < today);
                  return <tr key={task.id} className="hover:bg-[var(--cc-orange-50)]/60">
                    <td className="px-4 py-3"><span className={`inline-flex min-w-10 justify-center rounded-md border px-1.5 py-1 text-[9px] font-black ${task.priority === 'URGENT' || isOverdue ? 'border-red-200 bg-red-50 text-red-700' : 'border-[var(--color-border)] bg-[var(--cc-surface-2)] text-[var(--color-text-sub)]'}`}>{task.priority}</span></td>
                    <td className="max-w-[280px] px-3 py-3"><p className="truncate font-bold text-[var(--color-text-main)]">{project?.title || task.projectId}</p><p className="mt-0.5 truncate text-[11px] text-[var(--color-text-sub)]">{task.title}</p></td>
                    <td className="px-3 py-3 text-[var(--color-text-sub)]">{task.departmentId}</td>
                    <td className="px-3 py-3 font-semibold">{assignee ? getUserDisplayName(assignee) : '—'}</td>
                    <td className={`px-3 py-3 font-mono font-bold ${isOverdue ? 'text-[var(--cc-danger-700)]' : 'text-[var(--color-text-sub)]'}`}>{task.dueDate || '—'}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--cc-surface-3)]"><span className="block h-full bg-[var(--cc-orange-500)]" style={{ width: `${task.progress || 0}%` }} /></span><span className="font-mono tabular-nums">{task.progress || 0}%</span></div></td>
                    <td className="px-3 py-3"><span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-[10px] font-bold">{statusLabel(task.status)}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="cc-ops-panel">
          <div className="cc-section-heading"><span className="cc-heading-mark bg-[var(--cc-danger-500)]" /><h2>{copy.risk}</h2></div>
          <div className="grid grid-cols-3 gap-2 p-4">
            {[[copy.urgent, pendingApprovals.length], [copy.today, delayedTasks.length], [copy.week, urgentProjects.length]].map(([label, value], index) => <div key={String(label)} className={`rounded-lg border p-3 text-center ${index === 0 ? 'border-red-200 bg-red-50' : 'border-[var(--color-border)] bg-[var(--cc-surface-2)]'}`}><p className="text-[10px] font-bold text-[var(--color-text-sub)]">{label}</p><p className={`mt-1 font-mono text-2xl font-black ${index === 0 ? 'text-red-700' : ''}`}>{value}</p></div>)}
          </div>
          <div className="space-y-2 px-4 pb-4">
            {urgentProjects.slice(0, 2).map((project, index) => <div key={project.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-3"><div className="flex items-start gap-2"><ShieldAlert className={`mt-0.5 h-4 w-4 ${index === 0 ? 'text-red-600' : 'text-[var(--cc-orange-600)]'}`} /><div className="min-w-0"><p className="truncate text-xs font-bold">{project.title}</p><p className="mt-1 text-[10px] leading-4 text-[var(--color-text-sub)]">{language === 'vi' ? 'Cần kiểm tra lịch bàn giao và nguồn lực.' : '납품 일정과 투입 인력 확인이 필요합니다.'}</p></div></div></div>)}
            {urgentProjects.length === 0 && pendingApprovals.length === 0 && <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"><CheckCircle2 className="mb-2 h-5 w-5 text-[var(--cc-success-700)]" />{copy.noRisk}</div>}
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,.88fr)]">
        <div className="cc-ops-panel">
          <div className="cc-section-heading"><span className="cc-heading-mark bg-slate-500" /><h2>{copy.monthly}</h2><div className="ml-auto flex gap-3 text-[10px] text-[var(--color-text-sub)]"><span className="flex items-center gap-1"><i className="h-2 w-2 bg-slate-300" />{copy.planned}</span><span className="flex items-center gap-1"><i className="h-2 w-2 bg-[var(--cc-orange-500)]" />{copy.completed}</span></div></div>
          <div className="flex h-48 items-end gap-5 px-6 pb-5 pt-4 sm:gap-9">
            {chartData.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col justify-end"><div className="flex flex-1 items-end justify-center gap-1.5"><span className="w-3 max-w-5 bg-slate-200" style={{ height: `${Math.max(4, item.planned / chartMax * 100)}%` }} /><span className="w-3 max-w-5 bg-[var(--cc-orange-500)]" style={{ height: `${Math.max(2, item.completed / chartMax * 100)}%` }} /></div><p className="mt-2 text-center text-[10px] font-bold text-[var(--color-text-sub)]">{item.label}</p></div>)}
          </div>
        </div>
        <div className="min-h-64"><div className="mb-2 flex items-center gap-2 px-1 text-sm font-black"><Gauge className="h-4 w-4 text-[var(--cc-orange-600)]" />{copy.management}</div><ManagementSupportWidget /></div>
      </section>

      <div className="sr-only" aria-live="polite"><AlertTriangle />{urgentProjects.length}<CircleAlert />{pendingApprovals.length}<Clock3 />{delayedTasks.length}<Users />{users.length}</div>
      <div className="flex justify-end"><label className="sr-only" htmlFor="dashboard-project-type">Project type</label><select id="dashboard-project-type" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold" value={projectTypeFilter} onChange={(event) => setProjectTypeFilter(event.target.value as ProjectTypeFilter)}><option value="INTERNAL_DEVELOPMENT">{copy.internal}</option><option value="CLIENT_ORDER">{copy.order}</option></select></div>
    </div>
  );
};
