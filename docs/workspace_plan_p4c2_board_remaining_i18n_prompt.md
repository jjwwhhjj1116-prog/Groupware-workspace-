# P4-C2: Board Remaining & Other Modals i18n & A11y 구현 계획서

본 계획서는 P4-C 범위 중 P4-C1에서 다루지 않은 나머지 보드 컴포넌트 및 평가/일정 관련 모달들에 대한 다국어(i18n) 적용과 접근성(A11y) 처리 명세입니다.

## 1. 개요 및 목적
- **작업 목표**: ProjectPartBoard, ProjectSummaryCard, TaskDetailModal 등 복잡한 내부 컴포넌트와 기타 잔여 모달 화면에 표시되는 UI 라벨, 버튼, placeholder 등의 하드코딩된 한글 문자열을 다국어 처리하고 접근성 처리를 수행한다.

## 2. 작업 범위 (Scope) 및 허용 파일
P4-C2에서는 아래 파일만 수정 허용합니다.
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

그 외 `src/app/**`, `src/store/**`, `src/lib/apiClient.ts`, `src/lib/permissions.ts`, `src/lib/selectors.ts`, `src/data/**`, P4-A/B/C1 완료 파일 재수정 금지.

## 3. 대형 파일 처리 순서 고정
한 번에 전체 치환하지 않고 아래 순서로 진행합니다.

1. 작은 모달:
   - `PostDeliveryWorkModal.tsx`
   - `ProjectEvaluationModal.tsx`
   - `QcIssueModal.tsx`
   - `LeaveRegistrationModal.tsx`
2. 카드/보드:
   - `ProjectBoard.tsx`
   - `ProjectSummaryCard.tsx`
   - `ProjectPartBoard.tsx`
3. 복잡 파일:
   - `ProcessTemplateTab.tsx`
   - `TaskDetailModal.tsx` (이전에 빌드 실패를 만든 파일이므로 마지막에 최소 변경으로 처리)

## 4. 절대 금지 사항
- 새 상태 모델 추가 금지
- 기존 form 구조 변경 금지
- `newSegment` 같은 존재하지 않는 상태 도입 금지
- 저장 payload, approval request, audit log, notification message 번역 금지
- 비즈니스 로직 변경 금지
- layout 구조 변경 금지

## 5. i18n 적용 원칙 및 제외 기준

### 처리 대상:
- 화면 UI 라벨
- 버튼 텍스트
- placeholder
- modal title
- alert / confirm / prompt 중 사용자에게 즉시 표시되는 문장
- table header
- empty state
- badge/상태 표시 텍스트

### 제외 가능:
- DB/store에 저장되는 title, reason, message
- audit log message
- notification payload
- task/project title
- seed/default domain data
- 주석

## 6. 검증 및 커밋 기준
구현 후 아래 내용을 검증하여 보고해야 합니다.
- `git status --short --untracked-files=all`
- `git diff --name-status HEAD`
- `git diff --check HEAD`
- P4-C2 변경 파일 개별 ESLint
- `cmd.exe /c "npm run build"`
- `rg -n "[가-힣]" <P4-C2 허용 파일들>` 검색 및 남은 한글 문자열 제외 사유
- Codex 검수 PASS 전에는 커밋하지 않음 (작업트리 상태로 제출)
