# Workspace Plan P5-C: Error Pages & Final Sweep

이 문서는 Phase 5의 최종 단계(P5-C)인 전역 오류 페이지 다국어화, 접근성 개선 및 잔여 하드코딩 문자열 최종 검수에 대한 수정된 구현 계획서입니다.

## 1. 실제 존재하는 대상 파일 인벤토리
- `src/app/error.tsx` (1955 bytes)
- `src/app/not-found.tsx` (1202 bytes)
- `src/app/global-error.tsx` (1238 bytes)
- `src/lib/localization.ts` (다국어 키 추가용)

## 2. 변경 허용 파일의 명시적 목록
이번 P5-C 작업에서 수정이 허용된 파일은 **오직 아래의 5개 파일로 고정**됩니다. 이 외의 파일은 절대로 수정하지 않습니다.
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/app/global-error.tsx`
- `src/lib/localization.ts`
- `docs/workspace_plan_p5c_error_pages_final_sweep_prompt.md`

## 3. 변경 금지 파일과 이전 Phase 보호 정책
- **변경 금지**: P4 및 P5-A/B에서 이미 완료된 파일의 비즈니스 로직, 상태 관리(store), 라우팅.
- 기존 코드의 동작 방식은 유지하며, 오직 명시된 파일들에 한해 번역 치환 및 접근성(A11y) 속성 추가만 수행합니다.

## 4. UI 문자열과 저장 Payload 구분
- 화면에 노출되는 에러 메시지, 버튼 텍스트, 안내 문구 등만 UI 문자열로 간주하여 번역합니다.
- 콘솔에 출력되는 에러 로그(e.g., `console.error`), 에러 객체의 `digest`, `error.name`, `error.message`, `error.stack` 등 개발 환경 로그나 서버 전달 payload는 절대 번역하거나 원본을 훼손하지 않습니다.

## 5. 클라이언트 오류 경계에서 안전한 i18n 적용 방식
- **`error.tsx`**: `useUiStore`가 아닌, 실제 번역 기능을 담당하는 `useTranslationStore`와 `useTranslation` 훅을 import하여 안전하게 다국어화를 적용합니다.
- **`not-found.tsx`**: 현재 Server Component로 동작 중이므로, 최상단에 `'use client'` 지시어를 선언하여 클라이언트 컴포넌트로 전환한 뒤 `useTranslationStore` 및 `useTranslation`을 사용하여 번역을 적용합니다. 기존의 `<Link>` 라우팅 동작은 그대로 유지합니다.
- **`global-error.tsx`**:
  - RootLayout 밖에서 독립 실행되므로 Zustand Store를 import하지 않습니다.
  - 파일 내부에 KO/VI를 위한 최소 fallback 메시지 객체 사전을 하드코딩으로 정의합니다.
  - 초기 언어 상태는 `'ko'`로 설정합니다.
  - `useEffect` 내부에서 `localStorage`의 `workspace-translation-storage` 값을 `try/catch`로 안전하게 읽고 파싱합니다.
  - 저장된 `state.settings.uiLanguage` 값이 `'vi'`일 때만 VI 언어로 전환합니다.
  - JSON 파싱 에러나 localStorage 접근 불가 등 어떠한 실패라도 발생할 경우 언어는 `'ko'`를 유지합니다.
  - 한·영 병기 방식은 사용하지 않습니다.

## 6. A11y 및 focus-visible 점검 기준
- **`error.tsx`**: 모든 `<button>` 요소에 명시적인 `type="button"`을 부여하고, `focus-visible` 클래스(Tailwind)를 적용하여 키보드 접근성을 확보합니다.
- **`not-found.tsx`**: 홈으로 돌아가는 `<Link>` 요소 등에 `focus-visible`을 적용합니다.
- **`global-error.tsx`**:
  - 재시도 버튼에 `type="button"`을 명시합니다.
  - RootLayout과 `globals.css`가 실패할 수 있으므로, Tailwind의 `focus-visible`이나 CSS 변수에 의존하지 않습니다.
  - 브라우저의 기본 `outline`을 강제로 제거하지 않거나, 파일 내부의 self-contained inline style 등을 통해 버튼 포커싱 시의 시각적 피드백을 보장합니다.
  - 기존 계약대로 `<html>`과 `<body>`를 직접 렌더링하는 구조를 유지합니다.
- 오류 제목과 본문의 시맨틱 구조(예: `<h2>`, `<p>` 등)는 그대로 보존합니다.

## 7. 전역 잔류 한글 검색 및 분류 (Final Sweep)
전역 Sweep은 **읽기 전용 조사와 결과 보고** 목적으로만 수행하며, 변경 허용 파일 밖에서 잔류 UI를 발견하더라도 **절대 자동으로 치환하지 않습니다.**
검색된 모든 잔류 항목은 다음 기준으로 분류하여 파일/라인/분류/제안 내용을 제출하고, 필요시 별도 Codex 승인을 받습니다.
1. **사용자 UI 누락** (화면에 직접 노출되는 번역 누락)
2. **저장 payload** (DB나 서버로 전송되는 데이터)
3. **audit/notification 데이터** (감사 로그 및 알림 데이터)
4. **mock/default domain data** (로컬 개발용 더미 데이터 또는 기본 제공 도메인 값)
5. **주석/console** (개발자용 주석 및 콘솔 출력)
6. **사용자 입력 또는 저장된 콘텐츠** (사용자가 직접 입력하여 화면에 렌더링되는 콘텐츠)

## 8. KO/VI 키 대칭 및 동적 파라미터 검사
- `localization.ts`에 추가/수정되는 모든 키는 KO와 VI 양쪽에 대칭으로 존재해야 합니다.
- 다국어 키의 중복이나 누락이 없어야 합니다.
- 파라미터가 포함된 번역 키(`{count}`, `{message}` 등)가 인자 없이 호출되지 않았는지 철저히 검사합니다.

## 9. 빌드, ESLint, diff-check 검증 절차
- P5-C 수정 파일에 대해서만 개별 ESLint 검사를 수행합니다.
  - `npx eslint src/app/error.tsx src/app/not-found.tsx src/app/global-error.tsx src/lib/localization.ts`
- `npm run build`를 실행하여 정적 빌드 및 타입 체크 에러 여부를 확인합니다.
- `git diff --check HEAD`를 실행하여 Trailing Whitespace 등 공백 포맷팅 이슈를 검증합니다.
- 허용 파일 내에 번역되지 않은 잔류 한글이 있는지 최종 점검합니다.
- **신규 보안/구조 결함 방지**: 코드 내에 `dangerouslySetInnerHTML`의 신규 사용을 절대 금지합니다.

## 10. KO/VI 주요 라우트 브라우저 검증 절차
- `not-found.tsx`는 존재하지 않는 임의의 URL로 접근하여 수동 검증이 가능합니다.
- `error.tsx` 및 `global-error.tsx` 동작을 검증하기 위해 **기존 소스에 임시 `throw Error`를 삽입하거나 임시 라우트를 생성하는 행위는 엄격히 금지**됩니다.
- 에이전트 환경의 제약으로 브라우저 검증이나 에러 강제 트리거 테스트를 수행하지 못한 경우, 과장 없이 **"미수행"**으로 명확히 보고합니다.

## 11. Git 안전 규칙
- **기준 커밋**: `47358dd P5-B: Complete core routes i18n and accessibility`
- `stash@{0}` 조작 절대 금지.
- `git reset`, `git restore`, `git checkout` 일괄 복구 사용 금지.
- **본 계획서가 Codex 최종 승인을 받기 전까지는 소스 코드 수정, `git add`, `git commit`을 엄격히 금지**합니다.

## Final Sweep Result

| 파일 | 라인 | 분류 | 보존 사유 |
|---|---:|---|---|
| src/app/approvals/page.tsx | 58 | 저장 approval history comment | DB 저장 approval history comment |
| src/app/global-error.tsx | 7 | 로컬 KO fallback | Store 장애에도 동작해야 하는 의도된 로컬 KO fallback |
| src/app/global-error.tsx | 8 | 로컬 KO fallback | Store 장애에도 동작해야 하는 의도된 로컬 KO fallback |
| src/app/global-error.tsx | 9 | 로컬 KO fallback | Store 장애에도 동작해야 하는 의도된 로컬 KO fallback |
| src/app/page.tsx | 49 | comment/console | 한국어 주석 |
| src/app/projects/intake/page.tsx | 86 | notification payload | 알림 데이터 payload |
| src/app/projects/intake/page.tsx | 87 | notification payload | 알림 데이터 payload |
| src/app/projects/page.tsx | 132 | comment/console | 한국어 주석 |
| src/app/settings/bulk-edit/page.tsx | 33 | comment/console | 한국어 주석 |
| src/components/board/Board.tsx | 27 | render-time translated fallback constants | getColumns()에서 각 ID가 t() 값으로 교체되므로 실제 UI 번역 누락 아님 |
| src/components/board/Board.tsx | 28 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 29 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 30 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 31 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 32 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 36 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 39 | render-time translated fallback constants | 위와 동일 |
| src/components/board/Board.tsx | 40 | render-time translated fallback constants | 위와 동일 |
| src/components/board/PmDispatchModal.tsx | 41 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/PmDispatchModal.tsx | 43 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/PmDispatchModal.tsx | 164 | comment/console | 한국어/영어 혼합 주석 |
| src/components/board/PmDispatchModal.tsx | 202 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/PmDispatchModal.tsx | 210 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/PmDispatchModal.tsx | 237 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/PmDispatchModal.tsx | 244 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/PmDispatchModal.tsx | 256 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProcessTemplateTab.tsx | 60 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProcessTemplateTab.tsx | 80 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProcessTemplateTab.tsx | 81 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProjectPartBoard.tsx | 79 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProjectPartBoard.tsx | 80 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProjectPartBoard.tsx | 91 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProjectPartBoard.tsx | 114 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProjectPartBoard.tsx | 115 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ProjectPartBoard.tsx | 126 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ScheduleRequestModal.tsx | 80 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/board/ScheduleRequestModal.tsx | 81 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/dashboard/SuperAdminDashboard.tsx | 31 | comment/console | 한국어 주석 |
| src/components/layout/DataLoader.tsx | 62 | comment/console | 한국어/영어 혼합 주석 |
| src/components/schedule/LeaveRegistrationModal.tsx | 49 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/schedule/LeaveRegistrationModal.tsx | 63 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |
| src/components/schedule/LeaveRegistrationModal.tsx | 64 | 저장 domain/payload/audit/notification 데이터 | 저장 데이터 |

**총 검출 건수**: 42건

**분류별 건수 요약**:
- 저장 approval history comment: 1건
- 로컬 KO fallback: 3건
- comment/console: 6건
- notification payload: 2건
- render-time translated fallback constants: 9건
- 저장 domain/payload/audit/notification 데이터: 21건
- UI 번역 누락: 0건
