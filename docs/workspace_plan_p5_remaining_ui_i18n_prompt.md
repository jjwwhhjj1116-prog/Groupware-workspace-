# P5: Remaining UI I18n and A11y 구현 계획서

본 계획서는 기존 P4 범위에서 처리되지 않은 기타 잔여 UI 파일 및 신규 라우트에 대한 다국어(i18n) 적용과 접근성(A11y) 처리에 대한 명세입니다.
범위가 크고 잔여 파일이 많아 공식적으로 P5를 P5-A, P5-B, P5-C로 분할하며, 각 단계는 별도의 상세 계획 수립 및 Codex 승인 후에 구현을 진행해야 합니다.

## 1. 개요 및 목적
- **작업 목표**: 대상 파일 내 화면에 표시되는 하드코딩된 한글 문자열을 다국어 처리하고, 네이티브 컨트롤에 `focus-visible`을 추가하여 접근성(A11y)을 향상시킨다.
- **제한 사항**:
  - 데이터/store/API 변경 없음.
  - 백엔드 저장 Payload/Audit/Notification 데이터는 번역 대상 제외. (화면 표시 시점에만 매핑 처리)

## 2. 작업 범위 분할 (Scope)

### P5-A (현재 단계 완료/대상)
- 현재 완료된 Settings 하위 7개 페이지
  - `src/app/settings/bulk-edit/page.tsx`
  - `src/app/settings/data-quality/page.tsx`
  - `src/app/settings/import/page.tsx`
  - `src/app/settings/permissions/page.tsx`
  - `src/app/settings/personnel/page.tsx`
  - `src/app/settings/translation/page.tsx`
  - `src/app/settings/workspace/page.tsx`
- `src/components/workspace/AdminUserInvite.tsx`
- `src/components/auth/SessionManager.tsx`
- `src/lib/localization.ts`

### P5-B (다음 단계 이관 대상)
- `/approvals`
- `/conflicts`
- `/projects`
- `/projects/intake`
- `/schedules`
- `/evaluation`
- `/notifications`
- `/tasks/my`
- **조건**: 위 라우트에 직접 소속된 UI 파일만 허용
- **제약**: 구현 전에 별도 P5-B 상세 계획 및 Codex 승인 필수

### P5-C (최종 단계 이관 대상)
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/app/global-error.tsx`
- 전역 잔류 UI 문자열 최종 Sweep
- **제약**: 구현 전에 별도 P5-C 상세 계획 및 Codex 승인 필수

### 변경 금지 파일 목록 (Strictly Prohibited)
- `src/components/layout/**`
- `src/components/dashboard/**`
- `src/components/board/**`
- P4-C 완료 schedule/evaluation/delivery 컴포넌트
- `src/store/**`
- `apiClient.ts`, `permissions.ts` 등 비-UI 로직
- 백엔드 및 DB 관련 파일
- 이전 단계(P4 등)에서 이미 다국어 처리가 완료된 파일의 불필요한 재수정 금지

## 3. i18n 적용 원칙 및 A11y 기준
1. UI 라벨, 버튼, Placeholder 등 화면 UI 요소만 i18n 처리하며 데이터 계층 변경 금지.
2. 접근성: `<button>`, `<input>`, `<select>` 등 실제 인터랙티브 요소에만 `focus-visible` 적용.

## 4. 검증 및 보고 조건
구현 전/후 아래 절차에 따라 결과를 확인하여 보고합니다.
Codex PASS 전 구현 및 커밋 금지. Rollback은 사용자 승인 후에만 실행합니다.

- 단계별 검증 항목:
  - `git status --short --untracked-files=all` (불필요한 임시 파일 생성 방지)
  - `git diff --name-status HEAD` (허용 파일 외 변경 확인)
  - `git diff --check HEAD` (Trailing Whitespace 확인)
  - 변경 파일 전체 ESLint 통과
  - `cmd.exe /c "npm run build"` 성공 여부
  - focus-visible 등 A11y 누락 0건 최종 확인
  - 대상 파일 내 잔류 문자열 보고 (`rg -n "Last Updated:|By:|dangerouslySetInnerHTML" <대상 파일>`)
  - ko/vi 번역 키 일치, 수·누락·중복 확인
