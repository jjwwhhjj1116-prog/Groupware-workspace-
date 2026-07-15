# P4-C2: Board Remaining & Other Modals i18n & A11y 구현 계획서

본 계획서는 P4-C 범위 중 P4-C1에서 다루지 않은 나머지 보드 컴포넌트 및 평가/일정 관련 모달들에 대한 다국어(i18n) 적용과 접근성(A11y) 처리 명세입니다.

## 1. 개요 및 목적
- **작업 목표**: ProjectPartBoard, ProjectSummaryCard, TaskDetailModal 등 복잡한 내부 컴포넌트와 기타 잔여 모달 화면에 표시되는 UI 라벨, 버튼, placeholder 등의 하드코딩된 한글 문자열을 다국어 처리하고 접근성 처리를 수행한다.

## 2. 작업 범위 (Scope)

**변경 허용 파일:**
- `src/components/board/ProcessTemplateTab.tsx`
- `src/components/board/ProjectBoard.tsx`
- `src/components/board/ProjectPartBoard.tsx`
- `src/components/board/ProjectSummaryCard.tsx`
- `src/components/board/TaskDetailModal.tsx`
- `src/components/delivery/PostDeliveryWorkModal.tsx`
- `src/components/evaluation/ProjectEvaluationModal.tsx`
- `src/components/evaluation/QcIssueModal.tsx`
- `src/components/schedule/LeaveRegistrationModal.tsx`
- `src/lib/localization.ts`
- `docs/workspace_plan_p4c2_board_remaining_i18n_prompt.md`

## 3. i18n 적용 원칙 및 제외 기준
- P4-C1의 기준과 동일하게 적용하며, 백엔드 데이터(Audit Log, Notification)는 원본 한글 문자열을 유지합니다.
