'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  CircleDot,
  Cloud,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
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

const allRoles: Role[] = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM', 'WORKER', 'EVALUATION_ADMIN'];
const leaders: Role[] = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'PM'];

const navigation: NavigationItem[] = [
  { id: 'workspace', label: 'WORKSPACE', href: '/', icon: LayoutDashboard, roles: allRoles },
  { id: 'mail', label: '전자메일', href: '/mail', icon: Mail, roles: allRoles },
  { id: 'approvals', label: '전자결재', href: '/approvals', icon: FileCheck2, roles: allRoles, minLevel: 2, badge: '3' },
  { id: 'calendar', label: '캘린더', href: '/schedules', icon: CalendarDays, roles: allRoles },
  {
    id: 'projects', label: '프로젝트', icon: FolderKanban, roles: allRoles, minLevel: 2,
    children: [
      {
        id: 'project-management', label: '프로젝트 관리', roles: allRoles, minLevel: 3,
        children: [
          { id: 'estimate-requests', label: '견적 의뢰관리', href: '/projects/intake/estimate', roles: leaders },
          { id: 'estimate-sheets', label: '견적서 관리', href: '/projects/intake/estimates', roles: leaders },
          { id: 'estimate-db', label: 'DB관리', href: '/projects/intake/database', roles: leaders },
        ],
      },
      { id: 'project-intake', label: '프로젝트 접수', href: '/projects/intake', roles: leaders, minLevel: 3 },
      {
        id: 'technical-projects', label: '기술본부 프로젝트', roles: allRoles,
        children: [
          { id: 'finish-projects', label: '마감', href: '/projects?department=FINISH', roles: allRoles },
          { id: 'structure-projects', label: '구조&토목&조경', href: '/projects?department=STRUCTURE', roles: allRoles },
          { id: 'claim-projects', label: '클레임', href: '/conflicts', roles: leaders },
        ],
      },
    ],
  },
  {
    id: 'schedule-management', label: '일정관리', icon: CalendarDays, roles: allRoles, minLevel: 2,
    children: [
      { id: 'management-support-schedule', label: '경영지원본부', href: '/schedules?division=SUPPORT', roles: allRoles },
      {
        id: 'technical-schedule', label: '기술본부', roles: allRoles,
        children: [
          { id: 'finish-schedule', label: '마감', href: '/schedules?department=FINISH', roles: allRoles },
          { id: 'structure-schedule', label: '구조&토목&조경', href: '/schedules?department=STRUCTURE', roles: allRoles },
          { id: 'claim-schedule', label: '클레임', href: '/conflicts', roles: leaders },
        ],
      },
    ],
  },
  { id: 'drive', label: '드라이브', href: '/drive', icon: Cloud, roles: allRoles },
  { id: 'tasks', label: '할일', href: '/tasks/my', icon: CheckSquare2, roles: allRoles, minLevel: 2 },
  { id: 'board', label: '게시판', href: '/board', icon: MessageSquareText, roles: allRoles },
  { id: 'organization', label: '조직도', href: '/organization', icon: Network, roles: allRoles },
];

const utilityNavigation: NavigationItem[] = [
  { id: 'ai', label: 'AI 챗봇', href: '/ai-assistant', icon: Bot, roles: allRoles, badge: 'BETA' },
  { id: 'settings', label: '설정', href: '/settings', icon: Settings, roles: allRoles },
  { id: 'admin', label: '관리자설정', href: '/settings/permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'], minLevel: 5, badge: 'ADMIN' },
];

function isAllowed(item: NavigationItem, role: Role, level: number) {
  return (!item.roles || item.roles.includes(role)) && level >= (item.minLevel || 1);
}

function containsActivePath(item: NavigationItem, pathname: string): boolean {
  if (item.href) {
    const path = item.href.split('?')[0];
    if (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)) return true;
  }
  return item.children?.some((child) => containsActivePath(child, pathname)) ?? false;
}

function NavigationNode({ item, depth, role, level, pathname }: { item: NavigationItem; depth: number; role: Role; level: number; pathname: string }) {
  const visibleChildren = item.children?.filter((child) => isAllowed(child, role, level));
  const hasChildren = Boolean(visibleChildren?.length);
  const active = containsActivePath(item, pathname);
  const [open, setOpen] = React.useState(active || depth === 0 && ['projects', 'schedule-management'].includes(item.id));
  const Icon = item.icon ?? CircleDot;

  if (!isAllowed(item, role, level)) return null;

  if (hasChildren) {
    return (
      <div className={depth === 0 ? 'mt-1' : ''}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`group flex min-h-10 w-full items-center rounded-xl text-left font-bold transition-colors ${depth === 0 ? 'px-3 text-[13px]' : depth === 1 ? 'px-3 text-[12px]' : 'px-2.5 text-[12px]'} ${active ? 'bg-white/[.09] text-white' : 'text-slate-300 hover:bg-white/[.06] hover:text-white'}`}
        >
          <Icon className={`${depth === 0 ? 'mr-3 h-[18px] w-[18px]' : 'mr-2 h-3.5 w-3.5'} shrink-0 ${active ? 'text-[#ff8a3d]' : 'text-slate-500 group-hover:text-slate-300'}`} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className={`${depth === 0 ? 'ml-[22px] border-l border-white/10 pl-2' : 'ml-3 border-l border-white/[.08] pl-2'} mt-1 space-y-0.5`}>
            {visibleChildren?.map((child) => <NavigationNode key={child.id} item={child} depth={depth + 1} role={role} level={level} pathname={pathname} />)}
          </div>
        )}
      </div>
    );
  }

  if (!item.href) return null;
  const itemPath = item.href.split('?')[0];
  const exactActive = itemPath === '/' ? pathname === '/' : pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  return (
    <Link
      href={item.href}
      aria-current={exactActive ? 'page' : undefined}
      className={`group relative flex min-h-10 items-center rounded-xl font-bold ${depth === 0 ? 'px-3 text-[13px]' : depth === 1 ? 'px-3 text-[12px]' : 'px-2.5 text-[12px]'} ${exactActive ? 'bg-gradient-to-r from-[#4e6fd8]/35 to-[#4e6fd8]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]' : 'text-slate-300 hover:bg-white/[.06] hover:text-white'}`}
    >
      {exactActive && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#eb6300] shadow-[0_0_12px_rgba(235,99,0,.55)]" />}
      <Icon className={`${depth === 0 ? 'mr-3 h-[18px] w-[18px]' : 'mr-2 h-3.5 w-3.5'} shrink-0 ${exactActive ? 'text-[#ff9b57]' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-black ${item.badge === '3' ? 'bg-[#eb6300] text-white' : 'border border-white/10 bg-white/[.08] text-slate-300'}`}>{item.badge}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { isDarkMode, toggleDarkMode } = useUiStore();
  if (!currentUser) return null;
  const accessLevel = currentUser.permissionLevel || (currentUser.role === 'SUPER_ADMIN' ? 5 : currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'DEPARTMENT_MANAGER' ? 4 : currentUser.role === 'PM' ? 3 : 2);

  const mobile = [navigation[0], navigation[2], navigation[4], navigation[5], navigation[7]];

  return (
    <>
      <div className="hidden w-[292px] shrink-0 xl:block" aria-hidden="true" />
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden w-[292px] flex-col border-r border-white/10 bg-[#172554] text-white shadow-[12px_0_34px_rgba(18,32,77,.13)] xl:flex">
        <div className="flex h-[76px] items-center border-b border-white/10 px-5">
          <div className="flex h-11 w-[174px] items-center rounded-2xl bg-white px-3 shadow-[0_8px_22px_rgba(3,10,30,.24)]"><BrandLogo /></div>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5f7fe4] to-[#344d9a] text-sm font-black shadow-lg">{currentUser.name.slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[13px]">{currentUser.displayName || currentUser.name}</strong>
              <span className="block truncate text-[10px] font-semibold text-slate-400">{currentUser.departmentName || currentUser.teamName || '전사'} · {currentUser.role === 'SUPER_ADMIN' ? '최고관리자' : currentUser.jobTitle || currentUser.role}</span>
            </span>
            <LockKeyhole className="h-4 w-4 text-[#ff9b57]" />
          </div>
        </div>

        <nav aria-label="주요 메뉴" className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.2em] text-slate-500">Workspace</p>
          <div className="space-y-0.5">
            {navigation.map((item) => <NavigationNode key={item.id} item={item} depth={0} role={currentUser.role} level={accessLevel} pathname={pathname} />)}
          </div>

          <div className="my-4 h-px bg-white/10" />
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.2em] text-slate-500">System</p>
          <div className="space-y-0.5">
            {utilityNavigation.map((item) => <NavigationNode key={item.id} item={item} depth={0} role={currentUser.role} level={accessLevel} pathname={pathname} />)}
            <button type="button" onClick={toggleDarkMode} className="group flex min-h-10 w-full items-center rounded-xl px-3 text-[13px] font-bold text-slate-300 hover:bg-white/[.06] hover:text-white">
              {isDarkMode ? <Sun className="mr-3 h-[18px] w-[18px] text-amber-300" /> : <MoonStar className="mr-3 h-[18px] w-[18px] text-slate-500" />}
              <span className="flex-1 text-left">모드설정</span>
              <span className="text-[9px] font-black text-slate-500">{isDarkMode ? 'DARK' : 'LIGHT'}</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-3 text-[9px] font-bold tracking-[.12em] text-slate-600">CON-COST · VIETQS GROUPWARE</div>
      </aside>

      <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-3 bottom-3 z-[var(--z-mobile-nav)] grid min-h-[66px] grid-cols-5 rounded-[20px] border border-white/10 bg-[#172554]/95 p-1.5 shadow-[0_18px_42px_rgba(6,15,44,.35)] backdrop-blur-xl xl:hidden">
        {mobile.map((item) => {
          const Icon = item.icon ?? CircleDot;
          const href = item.href || (item.id === 'projects' ? '/projects' : item.id === 'schedule-management' ? '/schedules' : '/');
          const active = containsActivePath(item, pathname);
          return (
            <Link key={item.id} href={href} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[9px] font-black ${active ? 'bg-[#4e6fd8] text-white shadow-[0_6px_16px_rgba(78,111,216,.35)]' : 'text-slate-400 hover:bg-white/[.08] hover:text-white'}`}>
              <Icon className={`h-5 w-5 ${active ? 'text-white' : ''}`} />
              <span className="max-w-full truncate">{item.label.replace('WORKSPACE', '홈').replace('일정관리', '일정')}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
