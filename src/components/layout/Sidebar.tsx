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

function NavigationNode({ item, depth, role, level, pathname, searchString }: { item: NavigationItem; depth: number; role: Role; level: number; pathname: string; searchString: string }) {
  const visibleChildren = item.children?.filter((child) => isAllowed(child, role, level));
  const hasChildren = Boolean(visibleChildren?.length);
  const active = containsActivePath(item, pathname, searchString);
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
          className={`group flex min-h-10 w-full items-center rounded-xl text-left font-bold transition-colors ${depth === 0 ? 'px-3 text-[13px]' : depth === 1 ? 'px-3 text-[12px]' : 'px-2.5 text-[12px]'} ${active ? 'bg-black/[.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.14)]' : 'text-white/85 hover:bg-white/[.14] hover:text-white'}`}
        >
          <Icon className={`${depth === 0 ? 'mr-3 h-[18px] w-[18px]' : 'mr-2 h-3.5 w-3.5'} shrink-0 ${active ? 'text-white' : 'text-white/55 group-hover:text-white'}`} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/55 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className={`${depth === 0 ? 'ml-[22px] border-l border-white/25 pl-2' : 'ml-3 border-l border-white/20 pl-2'} mt-1 space-y-0.5`}>
            {visibleChildren?.map((child) => <NavigationNode key={child.id} item={child} depth={depth + 1} role={role} level={level} pathname={pathname} searchString={searchString} />)}
          </div>
        )}
      </div>
    );
  }

  if (!item.href) return null;
  const exactActive = isHrefActive(item.href, pathname, searchString);
  return (
    <Link
      href={item.href}
      aria-current={exactActive ? 'page' : undefined}
      className={`group relative flex min-h-10 items-center rounded-xl font-bold ${depth === 0 ? 'px-3 text-[13px]' : depth === 1 ? 'px-3 text-[12px]' : 'px-2.5 text-[12px]'} ${exactActive ? 'bg-white text-[#a94100] shadow-[0_8px_20px_rgba(130,48,0,.18),inset_0_1px_0_rgba(255,255,255,.8)]' : 'text-white/85 hover:bg-white/[.14] hover:text-white'}`}
    >
      {exactActive && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#ff6b00]" />}
      <Icon className={`${depth === 0 ? 'mr-3 h-[18px] w-[18px]' : 'mr-2 h-3.5 w-3.5'} shrink-0 ${exactActive ? 'text-[#ff6b00]' : 'text-white/55 group-hover:text-white'}`} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-black ${item.badge === '3' ? exactActive ? 'bg-[#ff6b00] text-white' : 'bg-white text-[#b44800]' : exactActive ? 'bg-[#fff1e6] text-[#b44800]' : 'border border-white/25 bg-black/10 text-white'}`}>{item.badge}</span>}
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

  const mobile = [navigation[0], navigation[2], navigation[4], navigation[5], navigation[7]];

  return (
    <>
      <div className="hidden w-[292px] shrink-0 xl:block" aria-hidden="true" />
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden w-[292px] flex-col border-r border-white/20 bg-[#ff6b00] text-white shadow-[12px_0_34px_rgba(122,45,0,.18)] xl:flex">
        <div className="flex h-[76px] items-center border-b border-white/20 px-6">
          <BrandLogo className="h-[34px] w-[166px] shrink-0 [&_img]:brightness-0 [&_img]:invert" />
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-black/[.10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.14)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-black shadow-[0_6px_16px_rgba(110,40,0,.16)]">{currentUser.name.slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[13px]">{currentUser.displayName || currentUser.name}</strong>
              <span className="block truncate text-[10px] font-semibold text-white/70">{currentUser.departmentName || currentUser.teamName || '전사'} · {currentUser.role === 'SUPER_ADMIN' ? '최고관리자' : currentUser.jobTitle || currentUser.role}</span>
            </span>
            <LockKeyhole className="h-4 w-4 text-white/80" />
          </div>
        </div>

        <nav aria-label="주요 메뉴" className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.2em] text-white/55">Workspace</p>
          <div className="space-y-0.5">
            {navigation.map((item) => <NavigationNode key={item.id} item={item} depth={0} role={currentUser.role} level={accessLevel} pathname={pathname} searchString={searchString} />)}
          </div>

          <div className="my-4 h-px bg-white/20" />
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.2em] text-white/55">System</p>
          <div className="space-y-0.5">
            {utilityNavigation.map((item) => <NavigationNode key={item.id} item={item} depth={0} role={currentUser.role} level={accessLevel} pathname={pathname} searchString={searchString} />)}
            <button type="button" onClick={toggleDarkMode} className="group flex min-h-10 w-full items-center rounded-xl px-3 text-[13px] font-bold text-white/85 hover:bg-white/[.14] hover:text-white">
              {isDarkMode ? <Sun className="mr-3 h-[18px] w-[18px] text-white" /> : <MoonStar className="mr-3 h-[18px] w-[18px] text-white/55" />}
              <span className="flex-1 text-left">모드설정</span>
              <span className="text-[9px] font-black text-white/55">{isDarkMode ? 'DARK' : 'LIGHT'}</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-white/20 px-5 py-3 text-[9px] font-bold tracking-[.12em] text-white/55">CON-COST · VIETQS GROUPWARE</div>
      </aside>

      <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-3 bottom-3 z-[var(--z-mobile-nav)] grid min-h-[66px] grid-cols-5 rounded-[20px] border border-white/10 bg-[#172554]/95 p-1.5 shadow-[0_18px_42px_rgba(6,15,44,.35)] backdrop-blur-xl xl:hidden">
        {mobile.map((item) => {
          const Icon = item.icon ?? CircleDot;
          const href = item.href || (item.id === 'projects' ? '/projects' : item.id === 'schedule-management' ? '/schedules' : '/');
          const active = containsActivePath(item, pathname, searchString);
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
