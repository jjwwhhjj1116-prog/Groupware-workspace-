export type TechnicalDepartmentScope = 'FINISH' | 'STRUCTURE';

type DepartmentScopedRecord = {
  departmentId?: string;
  departmentName?: string;
  teamName?: string;
  subDepartmentName?: string;
};

export function getTechnicalDepartmentScope(value: string | null): TechnicalDepartmentScope | null {
  return value === 'FINISH' || value === 'STRUCTURE' ? value : null;
}

export function getTechnicalDepartmentLabel(scope: TechnicalDepartmentScope | null) {
  return scope === 'FINISH' ? '마감' : scope === 'STRUCTURE' ? '구조·토목·조경' : '기술본부 전체';
}

export function matchesTechnicalDepartment(scope: TechnicalDepartmentScope | null, record: DepartmentScopedRecord) {
  if (!scope) return true;
  const haystack = [record.departmentId, record.departmentName, record.teamName, record.subDepartmentName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  if (scope === 'FINISH') return ['FINISH', '마감', 'INTERIOR'].some((token) => haystack.includes(token));
  return ['STRUCTURE', 'CIVIL', 'LANDSCAPE', '구조', '토목', '조경'].some((token) => haystack.includes(token));
}
