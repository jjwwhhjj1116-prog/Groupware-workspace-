'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { useUiStore } from '@/store/uiStore';
import { LayoutDashboard, Briefcase, Calendar, CheckSquare, Bell, Settings, ClipboardList, ChevronLeft, AlertTriangle, Menu, ShieldCheck, Database, FileUp, KanbanSquare, Inbox, ListTodo, CalendarDays, BarChart3, Users, Languages } from 'lucide-react';

export const Sidebar = () => {
  const pathname = usePathname();
  const { currentUser, appMode } = useAuthStore();
  const [isHovered, setIsHovered] = React.useState(false);
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

  const visibleMenus = menuItems.filter(item => currentUser && item.roles.includes(currentUser.role));

  const isExpanded = isHovered;
  const isCompact = !isExpanded;

  const innerWidthClass = isExpanded ? 'w-[240px]' : 'w-16';

  return (
    <>
    <div className="w-16 flex-shrink-0" />
    <div 
      className={`${innerWidthClass} fixed left-0 top-0 bg-slate-50 border-r border-[var(--color-border)] text-[var(--color-text-main)] min-h-screen flex flex-col transition-all duration-300 z-[100] shadow-lg`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <div className={`px-4 h-14 flex items-center border-b border-[var(--color-border)] bg-slate-50 ${!isExpanded ? 'justify-center' : ''}`}>
        <h1 className={`font-bold text-[var(--color-primary)] transition-all whitespace-nowrap overflow-hidden ${isExpanded ? 'text-lg tracking-tight' : 'text-sm'}`}>
          {isExpanded ? 'CON-COST&Viet_QS OS' : 'C&V'}
        </h1>
      </div>

      
      <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {visibleMenus.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.name} href={item.path} className={`flex items-center rounded-lg transition-all group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:z-10 ${!isExpanded ? 'justify-center py-3' : 'px-3 py-2.5'} ${isActive ? 'bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)]/50 text-[var(--color-primary)] font-bold' : 'text-[var(--color-text-sub)] hover:bg-gray-200/50 hover:text-[var(--color-text-main)] font-medium border border-transparent'}`}>
              <item.icon className={`flex-shrink-0 ${isExpanded ? 'w-4 h-4 mr-3' : isCompact ? 'w-5 h-5' : 'w-4 h-4'} ${isActive ? 'text-[var(--color-primary)]' : ''}`} />
              {isExpanded && <span className="truncate text-[13px]">{item.name}</span>}
              
              {/* Tooltip for collapsed states */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap z-[100] shadow-lg">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
    </>
  );
};
