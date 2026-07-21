'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Calendar,
  CheckSquare,
  ClipboardList,
  Database,
  FileUp,
  Languages,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const Sidebar = () => {
  const pathname = usePathname();
  const { currentUser, appMode } = useAuthStore();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const dailyWorkMenuItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM', 'WORKER'] },
    { name: t('projectIntake'), path: '/projects/intake', icon: Briefcase, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER'] },
    { name: t('projectBoard'), path: '/projects', icon: ClipboardList, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM', 'WORKER'] },
    { name: t('approvals'), path: '/approvals', icon: CheckSquare, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER'] },
    { name: t('conflicts'), path: '/conflicts', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM'] },
    { name: t('myTasks'), path: '/tasks/my', icon: CheckSquare, roles: ['PM', 'WORKER'] },
    { name: t('schedules'), path: '/schedules', icon: Calendar, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM'] },
    { name: t('notifications'), path: '/notifications', icon: Bell, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM', 'WORKER'] },
    { name: t('settings'), path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM', 'WORKER'] },
  ];

  const adminValidationMenuItems = [
    { name: t('workspaceSettings'), path: '/settings/workspace', icon: Settings, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { name: t('personnelManagement'), path: '/settings/personnel', icon: Users, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { name: t('importPreview'), path: '/settings/import', icon: FileUp, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { name: t('dataQuality'), path: '/settings/data-quality', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { name: t('bulkEdit'), path: '/settings/bulk-edit', icon: Database, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { name: t('permissions'), path: '/settings/permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { name: t('translationSettings'), path: '/settings/translation', icon: Languages, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  ];

  const menuItems = appMode === 'ADMIN_VALIDATION' ? adminValidationMenuItems : dailyWorkMenuItems;
  const visibleMenus = menuItems.filter((item) => currentUser && item.roles.includes(currentUser.role));
  const matchingPaths = visibleMenus
    .filter((item) => pathname === item.path || (item.path !== '/' && pathname.startsWith(`${item.path}/`)))
    .sort((a, b) => b.path.length - a.path.length);
  const activePath = matchingPaths[0]?.path;
  const mobileMenus = visibleMenus.length <= 5
    ? visibleMenus
    : [...visibleMenus.slice(0, 4), visibleMenus[visibleMenus.length - 1]];

  return (
    <>
      <div className="hidden w-[72px] shrink-0 md:block" aria-hidden="true" />
      <aside
        className={`fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden flex-col border-r border-white/10 bg-[var(--cc-ink-950)] text-white shadow-[8px_0_28px_rgba(15,23,42,.12)] transition-[width] duration-200 md:flex ${isExpanded ? 'w-[260px]' : 'w-[72px]'}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsExpanded(false);
        }}
      >
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-2">
          <div className={`flex h-10 items-center justify-center overflow-hidden rounded-xl bg-white px-2 transition-[width] duration-200 ${isExpanded ? 'w-[164px]' : 'w-11'}`}>
            <BrandLogo />
          </div>
        </div>

        <nav aria-label={t('navigation.primary')} className="custom-scrollbar flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {visibleMenus.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                title={!isExpanded ? item.name : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex min-h-11 items-center rounded-xl border focus-visible:outline-none ${isExpanded ? 'px-3' : 'justify-center px-2'} ${isActive
                  ? 'border-[color:rgb(235_99_0_/_0.32)] bg-[color:rgb(235_99_0_/_0.14)] text-white shadow-[inset_3px_0_0_var(--cc-orange-500)]'
                  : 'border-transparent text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}
              >
                <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? 'text-[var(--cc-orange-400)]' : ''} ${isExpanded ? 'mr-3' : ''}`} aria-hidden="true" />
                {isExpanded && <span className="truncate text-[13px] font-bold">{item.name}</span>}
                {isActive && <span className="sr-only">({t('navigation.current')})</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-white/10 p-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ${isExpanded ? 'block' : 'hidden'}`}>
          CON-COST · VIET QS
        </div>
      </aside>

      <nav aria-label={t('navigation.mobile')} className="fixed inset-x-3 bottom-3 z-[var(--z-mobile-nav)] grid min-h-[64px] grid-flow-col auto-cols-fr rounded-2xl border border-white/10 bg-[var(--cc-ink-950)] p-1.5 shadow-[var(--cc-shadow-3)] md:hidden">
        {mobileMenus.map((item) => {
          const isActive = activePath === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold focus-visible:outline-none ${isActive ? 'bg-[var(--cc-orange-500)] text-[var(--cc-ink-950)]' : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
