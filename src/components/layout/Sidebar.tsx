'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Bot,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  CircleDot,
  Cloud,
  FileCheck2,
  FolderKanban,
  Handshake,
  Home,
  Landmark,
  LockKeyhole,
  Mail,
  MessageSquareText,
  MoonStar,
  Network,
  Settings,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import type { Role } from '@/types/models';

type NavigationItem = {
  id: string;
  label: string;
  href?: string;
  icon?: React.ElementType;
  roles?: Role[];
  minLevel?: number;
  badge?: string;
  children?: NavigationItem[];
};

type RailItem = NavigationItem & { href: string; section: string; description: string };

const allRoles: Role[] = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM', 'WORKER', 'EVALUATION_ADMIN'];
const leaders: Role[] = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM'];

const projectNavigation: NavigationItem[] = [
  {
    id: 'project-management', label: '프로젝트 관리', icon: FolderKanban, roles: allRoles, minLevel: 3,
    children: [
      { id: 'estimate-requests', label: '견적 의뢰관리', href: '/projects/intake/estimate', roles: leaders },
      { id: 'estimate-sheets', label: '견적서 관리', href: '/projects/intake/estimates', roles: leaders },
      { id: 'estimate-db', label: 'DB관리', href: '/projects/intake/database', roles: leaders },
    ],
  },
  { id: 'project-intake', label: '프로젝트 접수', href: '/projects/intake', icon: FileCheck2, roles: leaders, minLevel: 3 },
  {
    id: 'technical-projects', label: '기술본부 프로젝트', icon: FolderKanban, roles: allRoles,
    children: [
      { id: 'finish-projects', label: '마감', href: '/projects?department=FINISH', roles: allRoles },
      { id: 'structure-projects', label: '구조·토목·조경', href: '/projects?department=STRUCTURE', roles: allRoles },
      { id: 'claim-projects', label: '클레임', href: '/conflicts', roles: leaders },
    ],
  },
];

const scheduleNavigation: NavigationItem[] = [
  { id: 'management-support-schedule', label: '경영지원본부', href: '/schedules?division=SUPPORT', icon: CalendarDays, roles: allRoles },
  {
    id: 'technical-schedule', label: '기술본부', icon: CalendarDays, roles: allRoles,
    children: [
      { id: 'finish-schedule', label: '마감', href: '/schedules?department=FINISH', roles: allRoles },
      { id: 'structure-schedule', label: '구조·토목·조경', href: '/schedules?department=STRUCTURE', roles: allRoles },
      { id: 'claim-schedule', label: '클레임', href: '/conflicts', roles: leaders },
    ],
  },
];

const railNavigation: RailItem[] = [
  { id: 'workspace', section: 'WORKSPACE', label: 'WORKSPACE', href: '/', icon: Home, roles: allRoles, description: '오늘의 업무와 주요 현황' },
  { id: 'mail', section: '전자메일', label: '전자메일', href: '/mail', icon: Mail, roles: allRoles, description: '업무 메일함과 중요 문서' },
  { id: 'approvals', section: '전자결재', label: '전자결재', href: '/approvals', icon: FileCheck2, roles: allRoles, minLevel: 2, badge: '3', description: '받은 결재와 배포 문서' },
  { id: 'calendar', section: '캘린더', label: '캘린더', href: '/schedules', icon: CalendarDays, roles: allRoles, description: '개인 일정과 회의' },
  { id: 'projects', section: '프로젝트', label: '프로젝트', href: '/projects?department=FINISH', icon: FolderKanban, roles: allRoles, minLevel: 2, description: '접수부터 납품까지' },
  { id: 'schedule-management', section: '일정관리', label: '일정관리', href: '/schedules?department=FINISH', icon: CalendarDays, roles: allRoles, minLevel: 2, description: '본부별 인력·프로젝트 일정' },
  { id: 'drive', section: '드라이브', label: '드라이브', href: '/drive', icon: Cloud, roles: allRoles, description: '회사·프로젝트 자료' },
  { id: 'tasks', section: '할일', label: '할일', href: '/tasks/my', icon: CheckSquare2, roles: allRoles, minLevel: 2, description: '내 업무와 마감 항목' },
  { id: 'board', section: '게시판', label: '게시판', href: '/board', icon: MessageSquareText, roles: allRoles, description: '전사·본부별 소식' },
  { id: 'organization', section: '조직도', label: '조직도', href: '/organization', icon: Network, roles: allRoles, description: '조직과 담당자 검색' },
  { id: 'sales', section: '영업', label: '영업', href: '/sales', icon: Handshake, roles: allRoles, minLevel: 2, description: '고객·기회·견적·계약 통합 관리' },
  { id: 'finance', section: '재무', label: '재무', href: '/finance', icon: Landmark, roles: allRoles, minLevel: 2, description: '매출·매입·자금·결산 통합 관리' },
];

const utilityNavigation: RailItem[] = [
  { id: 'ai-assistant', section: 'AI챗봇', label: 'AI챗봇', href: '/ai-assistant', icon: Bot, roles: allRoles, description: '업무 검색과 문서 작성 지원' },
  { id: 'settings', section: '설정', label: '설정', href: '/settings', icon: Settings, roles: allRoles, description: '개인 환경과 워크스페이스 설정' },
  { id: 'admin-settings', section: '관리자설정', label: '관리자설정', href: '/settings/permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'], description: '인력·권한·데이터 운영 관리' },
];

const panelMenus: Record<string, NavigationItem[]> = {
  workspace: [
    { id: 'workspace-home', label: '통합 대시보드', href: '/', icon: Home, roles: allRoles },
    { id: 'workspace-approval', label: '결재 대기', href: '/approvals', icon: FileCheck2, roles: allRoles },
    { id: 'workspace-tasks', label: '오늘 할일', href: '/tasks/my', icon: CheckSquare2, roles: allRoles },
    { id: 'workspace-schedule', label: '이번 달 일정', href: '/schedules', icon: CalendarDays, roles: allRoles },
  ],
  mail: [
    { id: 'mail-all', label: '전체메일', href: '/mail', icon: Mail, roles: allRoles },
    { id: 'mail-inbox', label: '받은편지함', href: '/mail?box=INBOX', roles: allRoles },
    { id: 'mail-sent', label: '보낸편지함', href: '/mail?box=SENT', roles: allRoles },
    { id: 'mail-starred', label: '중요 메일', href: '/mail?box=STARRED', roles: allRoles },
    { id: 'mail-project', label: '프로젝트 메일', href: '/mail?box=PROJECT', roles: allRoles },
  ],
  approvals: [
    { id: 'approval-home', label: '결재 홈', href: '/approvals', icon: FileCheck2, roles: allRoles },
    { id: 'approval-received', label: '받은결재함', href: '/approvals?box=RECEIVED', roles: allRoles },
    { id: 'approval-sent', label: '보낸결재함', href: '/approvals?box=SENT', roles: allRoles },
    { id: 'approval-consensus', label: '협의결재함', href: '/approvals?box=CONSENSUS', roles: allRoles },
    { id: 'approval-distributed', label: '배포문서함', href: '/approvals?box=DISTRIBUTED', roles: allRoles },
  ],
  calendar: [
    { id: 'calendar-all', label: '통합 캘린더', href: '/schedules', icon: CalendarDays, roles: allRoles },
    { id: 'calendar-personal', label: '내 일정', href: '/schedules?view=PERSONAL', roles: allRoles },
    { id: 'calendar-meeting', label: '회의·외근', href: '/schedules?view=MEETING', roles: allRoles },
    { id: 'calendar-leave', label: '휴가 일정', href: '/schedules?view=LEAVE', roles: allRoles },
  ],
  projects: projectNavigation,
  'schedule-management': scheduleNavigation,
  drive: [
    { id: 'drive-home', label: '드라이브 홈', href: '/drive', icon: Cloud, roles: allRoles },
    { id: 'drive-company', label: '회사 자료', href: '/drive?folder=COMPANY', roles: allRoles },
    { id: 'drive-project', label: '프로젝트 자료', href: '/drive?folder=PROJECT', roles: allRoles },
    { id: 'drive-recent', label: '최근 사용', href: '/drive?folder=RECENT', roles: allRoles },
  ],
  tasks: [
    { id: 'tasks-mine', label: '내 할일', href: '/tasks/my', icon: CheckSquare2, roles: allRoles },
    { id: 'tasks-today', label: '오늘 마감', href: '/tasks/my?filter=TODAY', roles: allRoles },
    { id: 'tasks-review', label: '검토 대기', href: '/tasks/my?filter=REVIEW', roles: allRoles },
    { id: 'tasks-done', label: '완료한 일', href: '/tasks/my?filter=DONE', roles: allRoles },
  ],
  board: [
    { id: 'board-all', label: '전체 게시판', href: '/board', icon: MessageSquareText, roles: allRoles },
    { id: 'board-notice', label: '전사 공지', href: '/board?category=NOTICE', roles: allRoles },
    { id: 'board-tech', label: '기술본부', href: '/board?category=TECH', roles: allRoles },
    { id: 'board-support', label: '경영지원본부', href: '/board?category=SUPPORT', roles: allRoles },
  ],
  organization: [
    { id: 'organization-chart', label: '조직도', href: '/organization', icon: Network, roles: allRoles },
    { id: 'organization-concost', label: 'CON-COST', href: '/organization?company=CON_COST', roles: allRoles },
    { id: 'organization-vietqs', label: 'VIETQS', href: '/organization?company=VIET_QS', roles: allRoles },
  ],
  sales: [
    { id: 'sales-home', label: '영업 대시보드', href: '/sales', icon: Handshake, roles: allRoles },
    { id: 'sales-customers', label: '고객·주소록', href: '/sales?view=CUSTOMERS', roles: allRoles },
    { id: 'sales-pipeline', label: '리드·영업기회', href: '/sales?view=PIPELINE', roles: allRoles },
    { id: 'sales-quotes', label: '견적·제안', href: '/sales?view=QUOTES', roles: allRoles },
    { id: 'sales-contracts', label: '계약·수주', href: '/sales?view=CONTRACTS', roles: allRoles },
    { id: 'sales-business-cards', label: '명함 자동등록', href: '/sales/business-cards', roles: allRoles },
    { id: 'sales-activities', label: '영업활동·후속조치', href: '/sales?view=ACTIVITIES', roles: allRoles },
  ],
  finance: [
    { id: 'finance-home', label: '재무 대시보드', href: '/finance', icon: Landmark, roles: allRoles },
    { id: 'finance-sales-purchases', label: '매출·매입', href: '/finance?view=SALES_PURCHASES', roles: allRoles },
    { id: 'finance-tax-invoices', label: '세금계산서', href: '/finance?view=TAX_INVOICES', roles: allRoles },
    { id: 'finance-cashflow', label: '수금·지급', href: '/finance?view=CASHFLOW', roles: allRoles },
    { id: 'finance-budget', label: '예산·실적', href: '/finance?view=BUDGET', roles: allRoles },
    { id: 'finance-expenses', label: '경비·법인카드', href: '/finance?view=EXPENSES', roles: allRoles },
    { id: 'finance-treasury', label: '자금현황', href: '/finance?view=TREASURY', roles: allRoles },
    { id: 'finance-closing', label: '결산·보고서', href: '/finance?view=CLOSING', roles: allRoles },
  ],
  'ai-assistant': [
    { id: 'ai-assistant-home', label: 'AI 챗봇', href: '/ai-assistant', icon: Bot, roles: allRoles },
  ],
  settings: [
    { id: 'settings-home', label: '개인 설정', href: '/settings', icon: Settings, roles: allRoles },
    { id: 'settings-translation', label: '언어·번역 설정', href: '/settings/translation', roles: allRoles },
  ],
  'admin-settings': [
    { id: 'admin-permissions', label: '접근등급·권한 관리', href: '/settings/permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { id: 'admin-personnel', label: '인력현황 관리', href: '/settings/personnel', roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { id: 'admin-workspace', label: '워크스페이스 관리', href: '/settings/workspace', roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { id: 'admin-data-quality', label: '데이터 품질 관리', href: '/settings/data-quality', roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  ],
};

function isAllowed(item: NavigationItem, role: Role, level: number) {
  return (!item.roles || item.roles.includes(role)) && level >= (item.minLevel || 1);
}

function isHrefActive(href: string, pathname: string, searchString: string): boolean {
  const [path, queryString = ''] = href.split('?');
  if (pathname !== path) return false;
  if (!queryString) return !searchString;
  const current = new URLSearchParams(searchString);
  const expected = new URLSearchParams(queryString);
  return Array.from(expected.entries()).every(([key, value]) => current.get(key) === value);
}

function containsActivePath(item: NavigationItem, pathname: string, searchString: string): boolean {
  if (item.href && isHrefActive(item.href, pathname, searchString)) return true;
  return item.children?.some((child) => containsActivePath(child, pathname, searchString)) ?? false;
}

function getActiveRail(pathname: string, searchString: string) {
  const params = new URLSearchParams(searchString);
  if (pathname === '/schedules') return params.has('department') || params.has('division') ? 'schedule-management' : 'calendar';
  if (pathname.startsWith('/projects') || pathname === '/conflicts') return 'projects';
  if (pathname.startsWith('/mail')) return 'mail';
  if (pathname.startsWith('/approvals')) return 'approvals';
  if (pathname.startsWith('/drive')) return 'drive';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/board')) return 'board';
  if (pathname.startsWith('/organization')) return 'organization';
  if (pathname.startsWith('/sales')) return 'sales';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/ai-assistant')) return 'ai-assistant';
  if (['/settings/permissions', '/settings/personnel', '/settings/workspace', '/settings/data-quality', '/settings/bulk-edit', '/settings/import'].some((path) => pathname.startsWith(path))) return 'admin-settings';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'workspace';
}

function PanelNode({ item, depth, role, level, pathname, searchString }: { item: NavigationItem; depth: number; role: Role; level: number; pathname: string; searchString: string }) {
  const visibleChildren = item.children?.filter((child) => isAllowed(child, role, level));
  const active = containsActivePath(item, pathname, searchString);
  const [open, setOpen] = React.useState(active || depth === 0);
  const Icon = item.icon ?? CircleDot;
  if (!isAllowed(item, role, level)) return null;

  if (visibleChildren?.length) {
    return (
      <div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`flex min-h-10 w-full items-center rounded-xl px-3 text-left text-[12px] font-black transition ${active ? 'bg-[#ffead5] text-[#a94100]' : 'text-[#4c3526] hover:bg-white/75'}`}>
          <Icon className={`mr-2.5 h-4 w-4 ${active ? 'text-[#eb6300]' : 'text-[#a98973]'}`} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-[#a98973] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="ml-5 mt-1 space-y-0.5 border-l border-[#f1d7c1] pl-2">{visibleChildren.map((child) => <PanelNode key={child.id} item={child} depth={depth + 1} role={role} level={level} pathname={pathname} searchString={searchString} />)}</div>}
      </div>
    );
  }

  if (!item.href) return null;
  const exactActive = isHrefActive(item.href, pathname, searchString);
  return (
    <Link href={item.href} aria-current={exactActive ? 'page' : undefined} className={`group relative flex min-h-10 items-center rounded-xl px-3 text-[12px] font-bold transition ${exactActive ? 'bg-white text-[#bd4b00] shadow-[0_7px_20px_rgba(129,65,18,.12)] ring-1 ring-[#f2d6bf]' : 'text-[#684d3b] hover:bg-white/70 hover:text-[#a94100]'}`}>
      {exactActive && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#ff6b00]" />}
      <Icon className={`mr-2.5 h-4 w-4 ${exactActive ? 'text-[#ff6b00]' : 'text-[#b79a85] group-hover:text-[#eb6300]'}`} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className="rounded-full bg-[#ff6b00] px-1.5 py-0.5 text-[9px] font-black text-white">{item.badge}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchString = useSearchParams().toString();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { isDarkMode, toggleDarkMode } = useUiStore();
  if (!currentUser) return null;

  const accessLevel = currentUser.permissionLevel || (currentUser.role === 'SUPER_ADMIN' ? 5 : currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'DEPARTMENT_MANAGER' ? 4 : currentUser.role === 'PM' ? 3 : 2);
  const activeRailId = getActiveRail(pathname, searchString);
  const visibleRail = railNavigation.filter((item) => isAllowed(item, currentUser.role, accessLevel));
  const visibleUtilities = utilityNavigation.filter((item) => isAllowed(item, currentUser.role, accessLevel));
  const activeRail = [...visibleRail, ...visibleUtilities].find((item) => item.id === activeRailId) || visibleRail[0];
  const panelItems = panelMenus[activeRail.id] || [];
  const mobile = railNavigation.filter((item) => ['workspace', 'approvals', 'projects', 'schedule-management', 'tasks'].includes(item.id));

  return (
    <>
      <div className="hidden w-[308px] shrink-0 xl:block" aria-hidden="true" />
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden w-[308px] pt-[64px] xl:flex">
        <Link href="/" aria-label="CON-COST 홈" className="absolute inset-x-0 top-0 z-10 flex h-[64px] items-center border-b border-[#efd8c4] bg-[#fffaf5] px-5 shadow-[0_8px_22px_rgba(86,52,24,.06)]">
          <BrandLogo className="h-[34px] w-[178px] shrink-0" />
          <ChevronDown className="ml-auto h-4 w-4 text-[#a98973]" />
        </Link>
        <div className="flex w-[76px] shrink-0 flex-col border-r border-white/15 bg-[#ff6b00] text-white shadow-[8px_0_24px_rgba(125,48,0,.12)]">
          <nav aria-label="글로벌 업무 메뉴" className="cc-scrollbar flex-1 overflow-y-auto px-1.5 py-2">
            <div className="space-y-1">
              {visibleRail.map((item) => {
                const Icon = item.icon ?? CircleDot;
                const active = item.id === activeRail.id;
                return (
                  <Link key={item.id} href={item.href} title={item.section} aria-current={active ? 'page' : undefined} className={`relative flex min-h-[55px] flex-col items-center justify-center gap-1 rounded-[14px] border text-[9px] font-black transition-all ${active ? 'border-white/30 bg-white/20 text-white shadow-[0_7px_18px_rgba(134,48,0,.18),inset_0_1px_0_rgba(255,255,255,.18)]' : 'border-transparent text-white/72 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/10 hover:text-white'}`}>
                    <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.5 : 2} />
                    <span className={item.id === 'workspace' ? 'text-[7px] tracking-[-.02em]' : ''}>{item.label}</span>
                    {item.badge && <span className="absolute right-1.5 top-1 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-black text-[#d45300] shadow-sm">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="space-y-1 border-t border-white/15 px-1.5 py-2">
            {visibleUtilities.filter((item) => item.id === 'ai-assistant').map((item) => {
              const Icon = item.icon ?? Bot;
              const active = item.id === activeRail.id;
              return <Link key={item.id} href={item.href} title={item.section} aria-current={active ? 'page' : undefined} className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-black transition ${active ? 'bg-white/20 text-white shadow-[0_5px_14px_rgba(134,48,0,.16)]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon className="h-[18px] w-[18px]" /><span>{item.label}</span></Link>;
            })}
            <button type="button" onClick={toggleDarkMode} title={isDarkMode ? '라이트모드로 전환' : '다크모드로 전환'} aria-pressed={isDarkMode} className="flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-black text-white/75 transition hover:bg-white/10 hover:text-white">{isDarkMode ? <Sun className="h-[18px] w-[18px]" /> : <MoonStar className="h-[18px] w-[18px]" />}<span>모드설정</span></button>
            {visibleUtilities.filter((item) => item.id !== 'ai-assistant').map((item) => {
              const Icon = item.icon ?? Settings;
              const active = item.id === activeRail.id;
              return <Link key={item.id} href={item.href} title={item.section} aria-current={active ? 'page' : undefined} className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-black transition ${active ? 'bg-white/20 text-white shadow-[0_5px_14px_rgba(134,48,0,.16)]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon className="h-[18px] w-[18px]" /><span>{item.label}</span></Link>;
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col border-r border-[#f0ddcd] bg-[#fff5eb] text-[#2f2118] shadow-[8px_0_30px_rgba(86,52,24,.07)]">
          <div className="border-b border-[#f0ddcd] px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ff6b00] shadow-[0_0_0_4px_rgba(255,107,0,.12)]" />
              <h2 className="text-[15px] font-black tracking-tight">{activeRail.section}</h2>
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-[#9a755c]">{activeRail.description}</p>
          </div>
          <nav aria-label={`${activeRail.section} 채널`} className="cc-scrollbar flex-1 overflow-y-auto p-3">
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.18em] text-[#b5957e]">Channels</p>
            <div className="space-y-1">{panelItems.map((item) => <PanelNode key={item.id} item={item} depth={0} role={currentUser.role} level={accessLevel} pathname={pathname} searchString={searchString} />)}</div>
          </nav>
          <div className="border-t border-[#f0ddcd] p-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#efd5c0] bg-white/70 p-2.5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffead5] text-xs font-black text-[#bd4b00]">{currentUser.name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] font-black">{currentUser.displayName || currentUser.name}</strong><span className="block truncate text-[9px] font-semibold text-[#9a755c]">{currentUser.departmentName || currentUser.teamName || '전사'} · {currentUser.role === 'SUPER_ADMIN' ? '최고관리자' : currentUser.jobTitle || currentUser.role}</span></span>
              <LockKeyhole className="h-3.5 w-3.5 text-[#eb6300]" />
            </div>
          </div>
        </div>
      </aside>

      <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-3 bottom-3 z-[var(--z-mobile-nav)] grid min-h-[66px] grid-cols-5 rounded-[20px] border border-white/10 bg-[#172554]/95 p-1.5 shadow-[0_18px_42px_rgba(6,15,44,.35)] backdrop-blur-xl xl:hidden">
        {mobile.map((item) => {
          const Icon = item.icon ?? CircleDot;
          const active = item.id === activeRail.id;
          return <Link key={item.id} href={item.href} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[9px] font-black ${active ? 'bg-[#ff6b00] text-white shadow-[0_6px_16px_rgba(235,99,0,.32)]' : 'text-slate-400 hover:bg-white/[.08] hover:text-white'}`}><Icon className="h-5 w-5" /><span className="max-w-full truncate">{item.label}</span></Link>;
        })}
      </nav>
    </>
  );
}
