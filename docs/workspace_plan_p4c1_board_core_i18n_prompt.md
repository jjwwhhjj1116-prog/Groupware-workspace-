# P4-C1: Board Core i18n & A11y 구현 계획서

본 계획서는 기존 P4-C 범위 중 핵심 컴포넌트에 대한 다국어(i18n) 적용과 접근성(A11y) 처리에 대한 명세입니다.
범위가 크고 잔여 파일이 많아 공식적으로 P4-C를 P4-C1과 P4-C2로 분할하며, 본 문서는 P4-C1에 대한 내용을 담고 있습니다.

## 1. 개요 및 목적
- **작업 목표**: Board 화면 및 일부 핵심 모달 화면에 표시되는 UI 라벨, 버튼, placeholder, alert, modal title의 하드코딩된 한글 문자열을 다국어 처리하고, `focus-visible`을 통해 접근성(A11y)을 향상시킨다.
- **제한 사항**: payload에 저장되는 데이터나 audit log, notification, approval request 등에 들어가는 백엔드 데이터는 다국어 번역을 적용하지 않고 원본 데이터를 유지합니다. 화면 표시 시점에만 화면 UI 문자열에 한정합니다.

## 2. 작업 범위 (Scope)

**변경 허용 파일 (명시된 파일만 허용):**
- `src/components/board/ApprovalReviewModal.tsx`
- `src/components/board/Board.tsx`
- `src/components/board/Column.tsx`
- `src/components/board/PmDispatchModal.tsx`
- `src/components/board/RevisionRequestModal.tsx`
- `src/components/board/ScheduleRequestModal.tsx`
- `src/components/board/TaskCardItem.tsx`
- `src/lib/localization.ts`
- `docs/workspace_plan_p4c1_board_core_i18n_prompt.md`
- `docs/workspace_plan_p4c2_board_remaining_i18n_prompt.md` (분할 계획 문서로 추가 허용)

**변경 금지 파일 (미처리 파일은 P4-C2로 이관):**
- `src/components/board/ProcessTemplateTab.tsx` (P4-C2로 이관)
- `src/components/board/ProjectBoard.tsx` (P4-C2로 이관)
- `src/components/board/ProjectPartBoard.tsx` (P4-C2로 이관)
- `src/components/board/ProjectSummaryCard.tsx` (P4-C2로 이관)
- `src/components/board/TaskDetailModal.tsx` (P4-C2로 이관)
- `src/components/delivery/PostDeliveryWorkModal.tsx` (P4-C2로 이관)
- `src/components/evaluation/ProjectEvaluationModal.tsx` (P4-C2로 이관)
- `src/components/evaluation/QcIssueModal.tsx` (P4-C2로 이관)
- `src/components/schedule/LeaveRegistrationModal.tsx` (P4-C2로 이관)
- `src/app/**`
- `src/store/**`
- `src/lib/apiClient.ts`
- `src/lib/permissions.ts`
- `src/lib/selectors.ts`
- `src/data/**`
- `src/components/workspace/AdminUserInvite.tsx`
- P4-A/P4-B 처리 파일 재수정 금지

## 3. i18n 적용 원칙 및 제외 기준
1. UI 라벨, 버튼, Placeholder, 모달 타이틀 등 화면 UI 요소만 i18n 처리합니다.
2. `addApprovalRequest({ title, reason })`, `addAuditLog({ message })`, `addNotification({ title, message })` 등 전송 데이터는 원본 데이터를 유지합니다.
3. 상태값(status, priority 등)은 도메인 문자열로 취급하며 화면 표시 시점에만 매핑합니다.
4. **접근성(A11y)**:
   - 실제 인터랙티브 요소에만 `focus-visible` 적용 (`focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none`).
   - 클릭 동작 없는 카드/리스트에 `cursor-pointer` 추가 금지.
   - 모달 focus trap은 타 라이브러리 도입 없이 기존 구조 안에서 가능한 최소 개선만 수행.
   - 레이아웃 및 비즈니스 로직 변경 절대 금지.

## 4. 검증 및 보고 조건
구현 후 아래 결과를 확인하여 보고합니다.
- `git diff --name-status HEAD~1..HEAD` (허용 파일 외 변경 0건 확인)
- `git diff --check HEAD~1..HEAD` (Trailing Whitespace 없음)
- 변경 파일 개별 ESLint 결과 확인
- `cmd.exe /c "npm run build"` 통과 확인
- `rg -n "[가-힣]" <P4-C1 허용 파일들>` 실행 후 남아 있는 한글 문자열 목록과 그 이유(데이터 도메인 문자열이거나 의도적으로 제외)를 설명.
