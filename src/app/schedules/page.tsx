'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, CalendarRange, CheckCircle2, Clock3, UsersRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { TaskCard } from '@/types/models';
import { PersonalSchedule } from '@/types/models'; // Added explicit import since we split them for multiline replace
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';
import { canViewSchedule, canViewEmployeeSchedule } from '@/lib/permissions';
import { getProjectOverallProgress } from '@/lib/selectors';
import { LeaveRegistrationModal } from '@/components/schedule/LeaveRegistrationModal';
import { PmScheduleWorkbench } from '@/components/schedule/PmScheduleWorkbench';
import { getTechnicalDepartmentLabel, getTechnicalDepartmentScope, matchesTechnicalDepartment } from '@/lib/departmentScope';

export default function SchedulesPage() {
  const searchParams = useSearchParams();
  const departmentScope = getTechnicalDepartmentScope(searchParams.get('department'));
  const departmentLabel = getTechnicalDepartmentLabel(departmentScope);
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { schedules } = useScheduleStore();
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  
  const [activeTab, setActiveTab] = useState<'MONTHLY_MATRIX' | 'PROJECT_SCHEDULE' | 'USER_DETAIL' | 'PM_MANAGEMENT'>('MONTHLY_MATRIX');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;

  const scopedUsers = users.filter(u => {
    if (!(u.employmentStatus === 'ACTIVE' || u.isActive)) return false;
    if (!canViewEmployeeSchedule(currentUser, u)) return false;
    if (!matchesTechnicalDepartment(departmentScope, u)) return false;
    return true;
  });

  const visibleUsers = scopedUsers.filter(u => {
    
    if (!showAllUsers) {
      if (u.id === 'u-ceo-hdm' || u.id === 'u-coo-lwh') return false;
      
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).setHours(0,0,0,0);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).setHours(23,59,59,999);
      
      const hasSchedules = schedules.some(s => {
        if (s.userId !== u.id) return false;
        const sStart = new Date(s.startDateTime).getTime();
        const sEnd = new Date(s.endDateTime).getTime();
        return (sStart <= monthEnd && sEnd >= monthStart);
      });

      const hasTasks = tasks.some(t => {
        if (t.assigneeId !== u.id || t.isDeleted) return false;
        if (!t.startDate || !t.dueDate) return false;
        const tStart = new Date(t.startDate).getTime();
        const tEnd = new Date(t.dueDate).setHours(23,59,59,999);
        return (tStart <= monthEnd && tEnd >= monthStart);
      });

      if (!hasSchedules && !hasTasks) return false;
    }
    return true;
  });

  // Filter based on role and rules
  const visibleSchedules = schedules.filter(s => {
    const targetUser = users.find(u => u.id === s.userId);
    return canViewSchedule(currentUser, s, targetUser);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const monthStartTime = new Date(year, month, 1).setHours(0, 0, 0, 0);
  const monthEndTime = new Date(year, month + 1, 0).setHours(23, 59, 59, 999);
  const scopedProjects = projects.filter((project) => !project.isDeleted && project.archiveStatus !== 'ARCHIVED' && matchesTechnicalDepartment(departmentScope, project));
  const scopedUserIds = new Set(scopedUsers.map((user) => user.id));
  const monthTasks = tasks.filter((task) => {
    if (task.isDeleted || !scopedUserIds.has(task.assigneeId || '')) return false;
    const start = task.startDate ? new Date(task.startDate).getTime() : null;
    const end = task.dueDate ? new Date(task.dueDate).setHours(23, 59, 59, 999) : start;
    return start !== null && end !== null && start <= monthEndTime && end >= monthStartTime;
  });
  const scheduleStats = {
    people: scopedUsers.length,
    activeTasks: monthTasks.filter((task) => task.status !== 'DONE').length,
    dueThisMonth: monthTasks.filter((task) => task.dueDate && new Date(task.dueDate).getFullYear() === year && new Date(task.dueDate).getMonth() === month).length,
    completed: monthTasks.filter((task) => task.status === 'DONE').length,
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const coversDate = (s: PersonalSchedule, d: number) => {
    const targetDate = new Date(year, month, d).setHours(0,0,0,0);
    const start = new Date(s.startDateTime).setHours(0,0,0,0);
    const end = new Date(s.endDateTime).setHours(0,0,0,0);
    return targetDate >= start && targetDate <= end;
  };

  const coversDateTask = (t: TaskCard, d: number) => {
    if (!t.startDate || !t.dueDate) return false;
    const targetDate = new Date(year, month, d).setHours(0,0,0,0);
    const start = new Date(t.startDate).setHours(0,0,0,0);
    const end = new Date(t.dueDate).setHours(0,0,0,0);
    return targetDate >= start && targetDate <= end;
  };

  const getScheduleColor = (type: string) => {
    if (type === 'OFF') return 'bg-red-100 text-red-800 border-red-200';
    if (type === 'MEETING' || type === 'CLIENT_MEETING') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (type === 'PERSONAL_WORK') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-[var(--color-text-main)] border-[var(--color-border)]';
  };

  const isToday = (d: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  };

  const getDayType = (d: number) => {
    const date = new Date(year, month, d);
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    if (day === 0) return 'SUN';
    if (day === 6) return 'SAT';
    return 'WEEKDAY';
  };

  const getDayHeaderClass = (d: number) => {
    if (isToday(d)) return 'bg-yellow-100 text-yellow-800 border-yellow-400 font-bold shadow-inner';
    const type = getDayType(d);
    if (type === 'SUN') return 'bg-red-50 text-red-500';
    if (type === 'SAT') return 'bg-blue-50 text-blue-500';
    return 'bg-[var(--color-bg)] text-[var(--color-text-sub)] font-medium';
  };

  const getDayCellClass = (d: number) => {
    if (isToday(d)) return 'bg-yellow-50/30 border-yellow-200';
    const type = getDayType(d);
    if (type === 'SUN') return 'bg-red-50/30';
    if (type === 'SAT') return 'bg-blue-50/30';
    return 'bg-[var(--color-surface)]';
  };

  const getTaskBarClass = (t: TaskCard, d: number) => {
    if (!t.startDate || !t.dueDate) return '';
    const targetDate = new Date(year, month, d).setHours(0,0,0,0);
    const start = new Date(t.startDate).setHours(0,0,0,0);
    const end = new Date(t.dueDate).setHours(0,0,0,0);
    
    let classes = "text-[10px] p-1 mb-1 shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-default transition-all ";
    
    // Status colors
    if (t.status === 'DONE') classes += "bg-green-100 text-green-800 border-green-200 ";
    else if (t.status === 'IN_PROGRESS') classes += "bg-indigo-100 text-indigo-800 border-indigo-200 ";
    else if (t.status === 'REVIEW') classes += "bg-purple-100 text-purple-800 border-purple-200 ";
    else if (t.priority === 'URGENT') classes += "bg-orange-100 text-orange-800 border-orange-200 ";
    else classes += "bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-border)] ";

    // Bar ends logic
    if (targetDate === start && targetDate === end) {
      classes += "rounded border mx-0.5 ";
    } else if (targetDate === start) {
      classes += "rounded-l border-y border-l ml-0.5 border-r-0 ";
    } else if (targetDate === end) {
      classes += "rounded-r border-y border-r mr-0.5 border-l-0 ";
    } else {
      classes += "border-y border-x-0 mx-0 ";
    }
    
    return classes;
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#0f766e_0%,#155e75_48%,#273e7a_100%)] p-5 text-white shadow-[0_22px_55px_rgba(21,94,117,.20)] sm:p-7">
        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100"><CalendarRange className="h-4 w-4" /> Resource schedule</div><h1 className="mt-3 text-2xl font-black tracking-tight sm:text-[30px]">기술본부 일정관리 · {departmentLabel}</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-cyan-50/85">참고 일정표의 인력 행 × 날짜 열 구조에 프로젝트 일정, 할일, 휴가와 PM 승인 흐름을 연결했습니다.</p></div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: '가용 인력', value: scheduleStats.people, icon: UsersRound },
              { label: '진행 업무', value: scheduleStats.activeTasks, icon: Activity },
              { label: '이번 달 마감', value: scheduleStats.dueThisMonth, icon: Clock3 },
              { label: '완료 업무', value: scheduleStats.completed, icon: CheckCircle2 },
            ].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="min-w-[126px] rounded-2xl border border-white/15 bg-white/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/18"><div className="flex items-center justify-between"><span className="text-[10px] font-black text-cyan-50/85">{stat.label}</span><Icon className="h-4 w-4 text-white/80" /></div><strong className="mt-2 block text-2xl font-black">{stat.value}</strong></div>; })}
          </div>
        </div>
      </section>

      <div className="cc-panel flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between sm:p-5">
        <div><h2 className="text-lg font-black text-[var(--color-text-main)]">일정 실행 보드</h2><p className="mt-1 text-[11px] font-semibold text-[var(--color-text-sub)]">월간 배치부터 PM 일정 승인까지 보기 방식을 전환합니다.</p></div>
        
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button 
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xl px-4 py-2.5 text-xs font-black ${activeTab === 'MONTHLY_MATRIX' ? 'bg-[#273e7a] text-white shadow-[0_7px_16px_rgba(39,62,122,.22)]' : 'bg-[var(--cc-surface-2)] text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('MONTHLY_MATRIX')}
          >
            {t('schedules.viewCalendar')}
          </button>
          <button 
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xl px-4 py-2.5 text-xs font-black ${activeTab === 'PROJECT_SCHEDULE' ? 'bg-[#273e7a] text-white shadow-[0_7px_16px_rgba(39,62,122,.22)]' : 'bg-[var(--cc-surface-2)] text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('PROJECT_SCHEDULE')}
          >
            {t('schedules.viewTimeline')}
          </button>
          <button 
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xl px-4 py-2.5 text-xs font-black ${activeTab === 'USER_DETAIL' ? 'bg-[#273e7a] text-white shadow-[0_7px_16px_rgba(39,62,122,.22)]' : 'bg-[var(--cc-surface-2)] text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('USER_DETAIL')}
          >
            {t('schedules.viewWorkload')}
          </button>
          <button
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xl px-4 py-2.5 text-xs font-black ${activeTab === 'PM_MANAGEMENT' ? 'bg-[#273e7a] text-white shadow-[0_7px_16px_rgba(39,62,122,.22)]' : 'bg-[var(--cc-surface-2)] text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)]'}`}
            onClick={() => setActiveTab('PM_MANAGEMENT')}
          >
            {t('pmSchedule.tab')}
          </button>
          
          <button 
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] col-span-2 rounded-xl bg-[#ff6b00] px-4 py-2.5 text-xs font-black text-white shadow-[0_7px_16px_rgba(235,99,0,.20)] hover:-translate-y-0.5 hover:bg-[#e85f00] sm:ml-2"
            onClick={() => setShowLeaveModal(true)}
          >
            {t('schedules.btnLeave')}
          </button>
        </div>
      </div>

      {activeTab !== 'PM_MANAGEMENT' && <div className="cc-panel space-y-4 p-4 sm:p-5">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={prevMonth} aria-label={t('schedules.prevMonth')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] p-2 bg-gray-100 rounded hover:bg-gray-200 text-sm font-medium transition-colors">&lt;</button>
            <select
              aria-label={t('schedules.selectMonth')}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] border rounded-lg p-2 bg-[var(--color-surface)] text-sm font-bold border-[var(--color-border-strong)] focus:ring-2 focus:ring-indigo-500"
              value={month}
              onChange={(e) => setCurrentDate(new Date(year, Number(e.target.value), 1))}
            >
              {[0, 1, 2, 3, 4, 5, 6].map(m => (
                <option key={m} value={m}>{t('schedules.lblYearMonth', { year: year.toString(), month: (m + 1).toString() })}</option>
              ))}
            </select>
            <button onClick={nextMonth} aria-label={t('schedules.nextMonth')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] p-2 bg-gray-100 rounded hover:bg-gray-200 text-sm font-medium transition-colors">&gt;</button>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-sub)] font-medium cursor-pointer bg-gray-50 px-3 py-1.5 rounded-md border">
              <input 
                type="checkbox" 
                checked={showAllUsers} 
                onChange={(e) => setShowAllUsers(e.target.checked)} 
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              {t('schedules.workload.includeEmpty')}
            </label>
            <div className="text-xl font-bold text-[var(--color-text-main)]">{t('schedules.lblYearMonth', { year: year.toString(), month: (month + 1).toString() })}</div>
          </div>
        </div>

        {activeTab === 'MONTHLY_MATRIX' && (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full min-w-[1200px] border-separate border-spacing-0 [&_td]:border-[var(--color-border)] [&_th]:border-[var(--color-border)]">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 bg-[var(--color-surface)] border-b-2 border-r-2 border-[var(--color-border)] p-3 text-sm font-bold text-[var(--color-text-main)] min-w-[140px] z-30 shadow-[1px_0_0_0_#e5e7eb]">
                    {t('schedules.workload.empName')}
                  </th>
                  {daysArray.map(d => (
                    <th key={d} className={`border-b-2 border-r p-2 text-xs text-center min-w-[48px] ${getDayHeaderClass(d)}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{d}</span>
                        <span className="text-[9px] opacity-70">
                          {[t('schedules.calendar.sun'), t('schedules.calendar.mon'), t('schedules.calendar.tue'), t('schedules.calendar.wed'), t('schedules.calendar.thu'), t('schedules.calendar.fri'), t('schedules.calendar.sat')][new Date(year, month, d).getDay()]}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map(user => {
                  const userSchedules = visibleSchedules.filter(s => s.userId === user.id);
                  const userTasks = tasks.filter(t => t.assigneeId === user.id && !t.isDeleted);

                  return (
                    <tr key={user.id} className="hover:bg-[var(--color-bg)]/50 transition-colors group">
                      <td className="sticky left-0 bg-[var(--color-surface)] group-hover:bg-[var(--color-bg)]/50 border-b border-r-2 p-3 text-sm font-bold text-[var(--color-text-main)] z-10 shadow-[1px_0_0_0_#e5e7eb]">
                        {getUserDisplayName(user)}
                        <div className="text-[10px] font-normal text-[var(--color-text-sub)]">{user.teamName || user.departmentName}</div>
                      </td>
                      {daysArray.map(d => {
                        const daySchedules = userSchedules.filter(s => coversDate(s, d));
                        const dayTasks = userTasks.filter(t => coversDateTask(t, d));
                        
                        return (
                          <td key={d} className={`border-b border-r p-1 align-top h-[60px] ${getDayCellClass(d)} transition-colors hover:bg-gray-100/50`}>
                            {daySchedules.map(ds => (
                              <div key={ds.id} className={`text-[10px] p-1 font-bold rounded border mb-1 truncate shadow-sm cursor-help ${getScheduleColor(ds.scheduleType)}`} title={`[${ds.scheduleType}] ${ds.title}\n${ds.startDateTime.substring(0,10)} ~ ${ds.endDateTime.substring(0,10)}\n${ds.description || ''}`}>
                                {ds.scheduleType === 'OFF' ? t('schedules.calendar.vacation') : (ds.scheduleType === 'MEETING' ? t('schedules.calendar.meeting') : ds.title.substring(0, 4))}
                              </div>
                            ))}
                            {dayTasks.map(dt => {
                              const isStart = new Date(dt.startDate!).setHours(0,0,0,0) === new Date(year, month, d).setHours(0,0,0,0);
                              return (
                                <div 
                                  key={dt.id} 
                                  className={getTaskBarClass(dt, d)} 
                                  title={t('schedules.calendar.tooltip', { status: dt.status, title: dt.title, start: dt.startDate || '', end: dt.dueDate || '', progress: dt.progress?.toString() || '0' })}
                                >
                                  <div className="truncate px-1">
                                    {isStart ? dt.title : '\u00A0'}
                                  </div>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {visibleUsers.length === 0 && <tr><td colSpan={daysArray.length + 1} className="h-44 border-b border-[var(--color-border)] bg-[var(--color-surface)] text-center"><strong className="block text-sm font-black text-[var(--color-text-main)]">표시할 팀 일정이 없습니다.</strong><span className="mt-1 block text-[11px] font-semibold text-[var(--color-text-sub)]">일정 없는 직원 포함을 선택하거나 PM 일정에서 배치를 등록해 주세요.</span></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'PROJECT_SCHEDULE' && (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0 [&_td]:border-[var(--color-border)] [&_th]:border-[var(--color-border)]">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 bg-[var(--color-surface)] border-b-2 border-r-2 p-3 text-sm font-bold text-[var(--color-text-main)] min-w-[240px] z-30 shadow-[1px_0_0_0_#e5e7eb]">{t('schedules.timeline.colProject')}</th>
                  {daysArray.map(d => (
                    <th key={d} className={`border-b-2 border-r p-2 text-xs font-medium text-center min-w-[48px] ${getDayHeaderClass(d)}`}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopedProjects.map(project => {
                  const pm = users.find(u => u.id === project.pmId);
                  const progress = getProjectOverallProgress(project, tasks);
                  
                  return (
                    <tr key={project.id} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                      <td className="sticky left-0 bg-[var(--color-surface)] border-b border-r-2 p-3 text-sm font-bold text-[var(--color-text-main)] z-10 shadow-[1px_0_0_0_#e5e7eb]">
                        <div className="truncate mb-1">{project.title}</div>
                        <div className="flex items-center gap-2 text-[10px] font-normal text-[var(--color-text-sub)]">
                          <span className={`px-1.5 py-0.5 rounded ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[var(--color-text-sub)]'}`}>{project.status}</span>
                          {pm && <span>PM: {getUserDisplayName(pm)}</span>}
                        </div>
                      </td>
                      {daysArray.map(d => {
                        const targetDate = new Date(year, month, d).setHours(0,0,0,0);
                        const start = project.startDate ? new Date(project.startDate).setHours(0,0,0,0) : null;
                        const end = project.deliveryDate ? new Date(project.deliveryDate).setHours(0,0,0,0) : (project.dueDate ? new Date(project.dueDate).setHours(0,0,0,0) : null);
                        
                        let isActive = false;
                        if (start && end && targetDate >= start && targetDate <= end) isActive = true;
                        
                        let barClass = "h-4 flex items-center shadow-sm relative z-10 transition-all ";
                        if (project.status === 'COMPLETED') barClass += "bg-green-400 ";
                        else if (project.status === 'ON_HOLD') barClass += "bg-gray-400 ";
                        else barClass += "bg-indigo-400 ";

                        if (targetDate === start && targetDate === end) {
                          barClass += "rounded mx-1 ";
                        } else if (targetDate === start) {
                          barClass += "rounded-l ml-1 ";
                        } else if (targetDate === end) {
                          barClass += "rounded-r mr-1 ";
                        } else if (isActive) {
                          barClass += "mx-0 ";
                        }
                        
                        return (
                          <td key={d} className={`border-b border-r p-1 align-middle h-[50px] ${getDayCellClass(d)} transition-colors hover:bg-gray-100/50`}>
                            {isActive && (
                              <div className={barClass} title={t('schedules.timeline.tooltip', { title: project.title, status: project.status, progress: progress.toString() })}>
                                {targetDate === start && (
                                  <div className="absolute left-2 text-[10px] font-bold text-white whitespace-nowrap drop-shadow-md">
                                    {progress}% 
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {scopedProjects.length === 0 && <tr><td colSpan={daysArray.length + 1} className="h-44 border-b border-[var(--color-border)] bg-[var(--color-surface)] text-center"><strong className="block text-sm font-black text-[var(--color-text-main)]">프로젝트 일정이 없습니다.</strong><span className="mt-1 block text-[11px] font-semibold text-[var(--color-text-sub)]">프로젝트 접수 후 PM 일정이 승인되면 타임라인에 자동 표시됩니다.</span></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'USER_DETAIL' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleUsers.map(user => {
              const userTasks = tasks.filter(t => t.assigneeId === user.id && !t.isDeleted && t.status !== 'DONE');
              const userSchedules = visibleSchedules.filter(s => s.userId === user.id);
              
              return (
                <div key={user.id} className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border)]">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {user.displayName?.[0] || user.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text-main)]">{getUserDisplayName(user)}</h3>
                      <p className="text-xs text-[var(--color-text-sub)]">{user.teamName || user.departmentName} · {user.jobTitle || user.organizationRank || user.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-sub)] mb-2 flex justify-between">
                        <span>{t('schedules.myInfo.inProgress')}</span>
                        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{t('schedules.myInfo.taskUnit', { count: userTasks.length.toString() })}</span>
                      </h4>
                      {userTasks.length > 0 ? (
                        <ul className="space-y-2">
                          {userTasks.slice(0, 3).map(t => (
                            <li key={t.id} className="text-sm bg-[var(--color-surface)] p-2 rounded border border-[var(--color-border)] shadow-sm">
                              <div className="font-medium text-[var(--color-text-main)] truncate" title={t.title}>{t.title}</div>
                              <div className="flex justify-between mt-1 text-xs text-[var(--color-text-sub)]">
                                <span>{t.startDate?.substring(5)} ~ {t.dueDate?.substring(5)}</span>
                                <span className="font-medium text-indigo-600">{t.progress || 0}%</span>
                              </div>
                            </li>
                          ))}
                          {userTasks.length > 3 && (
                            <li className="text-xs text-center text-[var(--color-text-sub)] font-medium pt-1">
                              {t('schedules.myInfo.moreTasks', { count: (userTasks.length - 3).toString() })}
                            </li>
                          )}
                        </ul>
                      ) : (
                        <div className="text-xs text-[var(--color-text-sub)] bg-[var(--color-surface)] p-2 rounded text-center border border-dashed border-[var(--color-border)]">{t('schedules.myInfo.noTasks')}</div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-sub)] mb-2">{t('schedules.myInfo.upcomingSched')}</h4>
                      {userSchedules.length > 0 ? (
                        <ul className="space-y-2">
                          {userSchedules.slice(0, 3).map(s => (
                            <li key={s.id} className="text-xs flex items-center gap-2 bg-[var(--color-surface)] p-2 rounded border border-[var(--color-border)]">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.scheduleType === 'OFF' ? 'bg-red-400' : 'bg-blue-400'}`}></span>
                              <span className="truncate flex-1 font-medium">{s.title}</span>
                              <span className="text-[var(--color-text-sub)] flex-shrink-0">{s.startDateTime.substring(5,10)}</span>
                            </li>
                          ))}
                          {userSchedules.length > 3 && (
                            <li className="text-xs text-center text-[var(--color-text-sub)] font-medium pt-1">
                              {t('schedules.myInfo.moreSched', { count: (userSchedules.length - 3).toString() })}
                            </li>
                          )}
                        </ul>
                      ) : (
                        <div className="text-xs text-[var(--color-text-sub)] bg-[var(--color-surface)] p-2 rounded text-center border border-dashed border-[var(--color-border)]">{t('schedules.myInfo.noSched')}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {activeTab === 'PM_MANAGEMENT' && <PmScheduleWorkbench />}

      <LeaveRegistrationModal 
        isOpen={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)} 
      />
    </div>
  );
}
