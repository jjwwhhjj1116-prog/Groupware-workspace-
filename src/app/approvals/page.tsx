'use client';

import React from 'react';
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileSearch,
  Files,
  GitPullRequestArrow,
  Inbox,
  Send,
  Settings2,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useApprovalStore } from '@/store/approvalStore';
import type { ApprovalRequest, ApprovalRequestType } from '@/types/models';

type QueueTab = 'ACTION' | 'PROGRESS' | 'DONE' | 'REJECTED';

const typeLabels: Record<ApprovalRequestType, string> = {
  SCHEDULE_APPROVAL: '일정 승인요청',
  SCHEDULE_REJECTION: '일정 반려검토',
  ADDITIONAL_TASK: '추가업무 요청',
  OVERTIME_REQUEST: '연장근무 신청',
  DEADLINE_EXTENSION: '납기연장 요청',
  TASK_REORDER: '업무순서 변경',
  PM_ASSIGNMENT: 'PM 배정요청',
  MANPOWER_SUPPORT: '인력지원 요청',
  PRIORITY_CHANGE: '우선순위 변경',
  SCHEDULE_REPLAN: '일정 재수립',
  PROCESS_SCHEDULE_APPROVAL: '공정일정 승인',
};

const statusLabels: Record<ApprovalRequest['status'], string> = {
  PENDING: '미결재',
  PM_REVIEWING: 'PM 검토',
  PM_APPROVED: 'PM 승인',
  MANAGER_REVIEWING: '본부장 검토',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

function statusTone(status: ApprovalRequest['status']) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  if (status === 'PENDING') return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300';
  return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
}

export default function ApprovalsPage() {
  const { currentUser, users } = useAuthStore();
  const { requests, updateApprovalStatus } = useApprovalStore();
  const [tab, setTab] = React.useState<QueueTab>('ACTION');

  if (!currentUser) return null;

  const isDeputyOf = (target?: string) => Boolean(target && users.find((user) => user.id === target)?.deputyApproverId === currentUser.id);
  const isActionable = (request: ApprovalRequest) => {
    if (currentUser.role === 'SUPER_ADMIN') return ['PENDING', 'PM_REVIEWING', 'PM_APPROVED', 'MANAGER_REVIEWING'].includes(request.status);
    if (request.status === 'PENDING' || request.status === 'PM_REVIEWING') return request.pmId === currentUser.id || isDeputyOf(request.pmId) || (!request.pmId && (request.managerId === currentUser.id || isDeputyOf(request.managerId)));
    if (request.status === 'PM_APPROVED' || request.status === 'MANAGER_REVIEWING') return request.managerId === currentUser.id || isDeputyOf(request.managerId);
    return false;
  };

  const visibleRequests = requests.filter((request) =>
    currentUser.role === 'SUPER_ADMIN' ||
    request.requestedBy === currentUser.id ||
    request.pmId === currentUser.id ||
    request.managerId === currentUser.id ||
    isDeputyOf(request.pmId) ||
    isDeputyOf(request.managerId)
  );

  const queue = visibleRequests.filter((request) => {
    if (tab === 'ACTION') return isActionable(request);
    if (tab === 'PROGRESS') return !['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status) && !isActionable(request);
    if (tab === 'DONE') return request.status === 'APPROVED';
    return request.status === 'REJECTED' || request.status === 'CANCELLED';
  });

  const summary = [
    { label: '받은결재함', value: visibleRequests.filter(isActionable).length, detail: '오늘 처리 필요', icon: Inbox, tone: 'blue' },
    { label: '보낸결재함', value: visibleRequests.filter((request) => request.requestedBy === currentUser.id).length, detail: '진행 문서 포함', icon: Send, tone: 'indigo' },
    { label: '협의결재함', value: visibleRequests.filter((request) => request.pmId === currentUser.id && request.requestedBy !== currentUser.id).length, detail: 'PM·대리결재', icon: UsersRound, tone: 'orange' },
    { label: '배포문서함', value: visibleRequests.filter((request) => request.status === 'APPROVED').length, detail: '승인 완료 문서', icon: Files, tone: 'emerald' },
  ];

  const act = (request: ApprovalRequest, action: 'APPROVED' | 'REJECTED', alternativeType?: ApprovalRequestType) => {
    let comment = '';
    if (action === 'REJECTED' || alternativeType) {
      comment = window.prompt(action === 'REJECTED' ? '반려 사유를 입력해 주세요.' : '대안 사유를 입력해 주세요.') || '';
      if (!comment) return;
    }
    const isPmStep = request.pmId === currentUser.id || isDeputyOf(request.pmId);
    const next = action === 'APPROVED' && isPmStep && request.managerId && ['PENDING', 'PM_REVIEWING'].includes(request.status)
      ? 'MANAGER_REVIEWING'
      : action;
    updateApprovalStatus(request.id, next, currentUser.id, comment || (next === 'MANAGER_REVIEWING' ? 'PM 1차 승인' : undefined), alternativeType);
  };

  return (
    <div className="space-y-6">
      <section className="cc-page-heading flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.12em] text-[#4e6fd8]"><ShieldCheck className="h-3.5 w-3.5" /> Approval center</div>
          <h1 className="text-[28px] font-black tracking-[-.04em] text-[var(--color-text-main)]">전자결재</h1>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-sub)]">나에게 필요한 문서와 결재 흐름을 한 화면에서 확인합니다.</p>
        </div>
        <button type="button" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#eb6300] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(235,99,0,.22),inset_0_1px_0_rgba(255,255,255,.25)] hover:-translate-y-1 hover:bg-[#cf4d00] hover:shadow-[0_18px_34px_rgba(235,99,0,.3)]">
          <FilePlus2 className="h-4 w-4" /> 문서 작성
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item, index) => {
          const Icon = item.icon;
          const iconTone = item.tone === 'orange' ? 'bg-orange-50 text-[#eb6300]' : item.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#eef2ff] text-[#4e6fd8]';
          return (
            <button key={item.label} type="button" onClick={() => setTab(index === 0 ? 'ACTION' : index === 3 ? 'DONE' : 'PROGRESS')} className="cc-tactile-card group flex min-h-[142px] items-start gap-4 p-5 text-left" data-interactive="true">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTone} shadow-[inset_0_1px_0_rgba(255,255,255,.8)]`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-[var(--color-text-sub)]">{item.label}</span>
                <strong className="mt-2 block text-3xl font-black tracking-[-.05em] text-[var(--color-text-main)]">{item.value}<small className="ml-1 text-xs font-bold text-[var(--color-text-sub)]">건</small></strong>
                <span className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[var(--color-text-sub)]">{item.detail}<ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="cc-tactile-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black tracking-[-.02em] text-[var(--color-text-main)]">내 결재 및 확인할 문서</h2>
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-sub)]">결재권한과 대리결재 설정이 반영된 목록입니다.</p>
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[var(--cc-surface-2)] p-1">
              {([['ACTION', '미결재'], ['PROGRESS', '진행중'], ['DONE', '완료'], ['REJECTED', '반려']] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-[11px] font-black ${tab === id ? 'bg-[var(--color-surface)] text-[#3453a4] shadow-sm' : 'text-[var(--color-text-sub)]'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {queue.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4e6fd8]"><FileCheck2 className="h-6 w-6" /></span>
                <strong className="text-sm font-black text-[var(--color-text-main)]">현재 문서가 없습니다.</strong>
                <span className="mt-1 text-xs font-semibold text-[var(--color-text-sub)]">새 문서가 도착하면 이곳에 표시됩니다.</span>
              </div>
            ) : queue.map((request) => {
              const requester = users.find((user) => user.id === request.requestedBy);
              const actionable = isActionable(request);
              return (
                <article key={request.id} className="group grid gap-4 p-5 transition-colors hover:bg-[#f7f9ff] dark:hover:bg-white/[.03] lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5f7fe4] to-[#273e7a] text-xs font-black text-white shadow-sm">{requester?.name.slice(0, 1) || '?'}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${statusTone(request.status)}`}>{statusLabels[request.status]}</span>
                        <span className="text-[10px] font-bold text-[var(--color-text-sub)]">{typeLabels[request.type]}</span>
                      </div>
                      <h3 className="mt-2 truncate text-sm font-black text-[var(--color-text-main)]">{request.title}</h3>
                      <p className="mt-1 truncate text-[11px] font-semibold text-[var(--color-text-sub)]">{requester?.name || '요청자'} · {new Date(request.createdAt).toLocaleDateString('ko-KR')} · {request.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 lg:justify-center">
                    {['기안', 'PM', '본부장', '대표'].map((step, index) => (
                      <React.Fragment key={step}>
                        <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[8px] font-black ${index === 0 || request.status === 'APPROVED' || index === 1 && request.status !== 'PENDING' ? 'bg-[#4e6fd8] text-white' : index === 2 && request.status === 'MANAGER_REVIEWING' ? 'bg-[#eb6300] text-white' : 'border border-[var(--color-border)] bg-[var(--cc-surface-2)] text-[var(--color-text-sub)]'}`}>{step}</span>
                        {index < 3 && <ChevronRight className="h-3 w-3 text-[var(--color-text-sub)]" />}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex gap-2 lg:justify-end">
                    {actionable ? (
                      <>
                        <button type="button" onClick={() => act(request, 'APPROVED')} className="flex min-h-9 items-center gap-1.5 rounded-lg bg-[#273e7a] px-3 text-[10px] font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#3453a4]"><Check className="h-3.5 w-3.5" /> 승인</button>
                        <button type="button" onClick={() => act(request, 'REJECTED')} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[10px] font-black text-red-700 hover:-translate-y-0.5"><X className="h-3.5 w-3.5" /> 반려</button>
                      </>
                    ) : <button type="button" className="flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[10px] font-black text-[var(--color-text-sub)] hover:-translate-y-0.5 hover:shadow-md">상세보기 <ChevronRight className="h-3.5 w-3.5" /></button>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="cc-tactile-card p-5" data-interactive="true">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-sm font-black text-[var(--color-text-main)]">결재 흐름</h2><p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">기본 승인선 · 프로젝트 문서</p></div>
              <GitPullRequestArrow className="h-5 w-5 text-[#4e6fd8]" />
            </div>
            <div className="space-y-0">
              {[
                ['기안자', currentUser.name, '완료'],
                ['PM', '박용진', '완료'],
                ['본부장', '현동명', '진행'],
                ['대표', '최종 승인', '대기'],
              ].map(([role, name, state], index) => (
                <div key={role} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < 3 && <span className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-[var(--color-border)]" />}
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${state === '완료' ? 'bg-[#4e6fd8] text-white' : state === '진행' ? 'bg-[#eb6300] text-white shadow-[0_6px_16px_rgba(235,99,0,.24)]' : 'border border-[var(--color-border)] bg-[var(--cc-surface-2)] text-[var(--color-text-sub)]'}`}>{index + 1}</span>
                  <div className="min-w-0 flex-1 pt-0.5"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] font-black text-[var(--color-text-main)]">{role}</strong><span className="text-[9px] font-bold text-[var(--color-text-sub)]">{state}</span></div><p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">{name}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#dbe3f4] bg-[#f4f7ff] p-3 text-[10px] font-bold text-[#40537a] dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300"><ShieldCheck className="h-4 w-4 text-[#eb6300]" /> 대리결재자 설정이 적용됩니다.</div>
          </div>

          <div className="cc-tactile-card p-5">
            <h2 className="mb-4 text-sm font-black text-[var(--color-text-main)]">빠른 도구</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                [Files, '문서양식'], [Archive, '임시보관'], [Settings2, '결재선 관리'], [UsersRound, '대리결재'], [FileSearch, '문서검색'], [CalendarDays, '결재일정'],
              ].map(([Icon, label]) => {
                const ToolIcon = Icon as React.ElementType;
                return <button key={label as string} type="button" className="flex min-h-16 flex-col items-start justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-3 text-[10px] font-black text-[var(--color-text-main)] hover:-translate-y-1 hover:border-[#4e6fd8]/40 hover:bg-[var(--color-surface)] hover:shadow-lg"><ToolIcon className="h-4 w-4 text-[#4e6fd8]" />{label as string}</button>;
              })}
            </div>
          </div>
        </aside>
      </section>

      <section className="cc-tactile-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
          <div><h2 className="text-sm font-black text-[var(--color-text-main)]">결재 일정</h2><p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">2026년 7월 · 마감일과 휴가 일정</p></div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-sub)]"><Clock3 className="h-3.5 w-3.5" /> 오늘 기준</div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-[var(--color-border)]">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => <div key={day} className="bg-[var(--cc-surface-2)] py-2 text-center text-[9px] font-black text-[var(--color-text-sub)]">{day}</div>)}
          {Array.from({ length: 35 }, (_, index) => index - 2).map((day, index) => (
            <div key={index} className="min-h-20 bg-[var(--color-surface)] p-2 sm:min-h-24">
              {day > 0 && day <= 31 && <><span className={`text-[10px] font-black ${day === 22 ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[#273e7a] text-white' : 'text-[var(--color-text-sub)]'}`}>{day}</span>{[8, 15, 22, 29].includes(day) && <span className={`mt-2 block truncate rounded-md px-1.5 py-1 text-[8px] font-black ${day === 22 ? 'bg-orange-50 text-orange-700' : 'bg-[#eef2ff] text-[#405bb0]'}`}>{day === 22 ? '견적 승인 마감' : '결재 예정'}</span>}</>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
