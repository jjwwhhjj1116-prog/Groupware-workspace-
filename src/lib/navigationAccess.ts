import type { PersonnelCard, Role } from '@/types/models';

export type NavigationAccessRule = {
  roles?: Role[];
  minLevel?: number;
};

export function getNavigationAccessLevel(
  user: Pick<PersonnelCard, 'role' | 'permissionLevel'>,
) {
  if (user.permissionLevel) return user.permissionLevel;
  if (user.role === 'SUPER_ADMIN') return 5;
  if (user.role === 'SYSTEM_ADMIN' || user.role === 'DEPARTMENT_MANAGER') return 4;
  if (user.role === 'PM') return 3;
  return 2;
}

export function canAccessNavigation(
  rule: NavigationAccessRule,
  role: Role,
  level: number,
) {
  return (!rule.roles || rule.roles.includes(role)) && level >= (rule.minLevel || 1);
}
