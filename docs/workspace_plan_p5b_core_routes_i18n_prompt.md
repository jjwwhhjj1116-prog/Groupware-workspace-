# P5-B: Core Routes I18n and A11y Implementation Plan

## 1. 기준 상태 (Baseline)
- **Baseline Commit:** `d140a33`
- **Stash 보존:** 기존 `stash@{0}` 영역의 코드를 pop, apply, drop, clear 하지 않고 안전하게 보존합니다.
- **일괄 복구 금지:** `git reset`, `git restore`, `git checkout`을 이용한 일괄 복구를 사용하지 않습니다.
- **커밋 금지:** Codex PASS 승인 전까지는 절대로 소스 수정과 git commit을 수행하지 않습니다.
- **임시 스크립트 금지:** 구현과 분석 시 임시 JS/TS 파일을 생성하거나 사용하지 않습니다.

## 2. 변경 허용 파일 목록
다음 명시된 10개 파일 이외의 소스 코드는 **절대 수정하지 않습니다.**
- `src/app/approvals/page.tsx`
- `src/app/conflicts/page.tsx`
- `src/app/projects/page.tsx`
- `src/app/projects/intake/page.tsx`
- `src/app/schedules/page.tsx`
- `src/app/evaluation/page.tsx`
- `src/app/notifications/page.tsx`
- `src/app/tasks/my/page.tsx`
- `src/lib/localization.ts`
- `docs/workspace_plan_p5b_core_routes_i18n_prompt.md`

## 3. 변경 금지 영역
아래에 해당하는 컴포넌트, 로직, 설정 파일들은 P5-B 단계의 작업 대상이 아닙니다.
- `src/components/board/**`
- `src/components/schedule/**`
- `src/components/evaluation/**`
- `src/components/delivery/**`
- `src/components/layout/**`
- `src/components/dashboard/**`
- `src/store/**`
- `src/types/**`
- `src/lib/permissions.ts` 및 기타 비-UI 도메인 로직
- `package.json`, lock 파일 등 시스템 설정 파일 전반

## 4. UI vs 저장 데이터 (번역 정책)
데이터 저장 및 기록의 일관성을 위해 UI 노출 텍스트와 백엔드 보존 텍스트를 철저히 구분합니다.

**[번역 대상 - UI 전용 문자열]**
- 화면의 제목, 설명, 안내 문구
- 버튼 이름, 탭 이름, 필터 및 테이블 헤더
- placeholder, 빈 화면(Empty state) 상태 메시지
- alert, confirm, prompt 창의 사용자 안내 문구
- 툴팁 및 접근성(aria-label) 레이블
- 화면 출력용 정적 접두사(예: "기간:", "상태:")

**[번역 금지 - 데이터/저장 텍스트 (원문 유지)]**
- DB/스토어에 저장되는 알림, 승인, 감사 로그의 데이터 (title, message, comment, reason 등)
- 서버나 스토어로 전달되는 Payload 데이터 전체
- 사용자가 직접 prompt/input 등으로 입력한 텍스트
- 도메인 상태 코드, Enum, 고유 식별자 문자열
- **특정 예외 사항 명시:**
  - `projects/intake/page.tsx`: PM 배정 알림(notification)의 payload 데이터
  - `approvals/page.tsx`: 승인 이력(history) 및 코멘트(comment) 데이터
  - `projects/page.tsx` 등: Audit 로그 및 Request Reason 텍스트
  - `evaluation/page.tsx`: 사용자가 입력한 이의신청 사유(reason) 데이터

## 5. 동적 문구 처리 정책
정적 텍스트와 변수를 단순 문자열 결합(`+` 또는 템플릿 리터럴) 형태로 조합하여 번역 파편화를 유발하지 않습니다.
- 모든 동적 문구는 번역 키 내부에서 파라미터(`{variable}`) 형태로 처리합니다.
- 예: 연도/월/일 포맷, 업무/알림 건수(`{count}건`), 점수(`{score}점`), 동적 진행률/툴팁, 사용자 이름 등.

## 6. 기존 구현 보존 정책
- `projects/page.tsx` 및 `intake/page.tsx` 내 이미 존재하는 `useTranslation` 훅 및 번역 키 설정을 재사용합니다.
- 기존의 이벤트 핸들러 로직, 권한 제어 분기, Zustand 스토어 갱신 흐름, 필터링 로직, 라우팅 동작은 **일절 변경하지 않습니다.**
- P4-C 등 이전 단계에서 완성된 하위 컴포넌트는 재수정하지 않고 현 상태를 보존합니다.

## 7. 웹 접근성 (A11y) 적용 기준
변경 허용된 8개 라우트 페이지의 모든 네이티브 클릭 요소와 입력 컨트롤에 대해 접근성을 강화합니다.
- 대상: `button`, `input`, `select`, `textarea` 및 주요 인터랙티브 요소
- 조치 내용: 단순히 모든 요소에 일괄적으로 클래스를 치환하는 대신, 각 컨트롤을 식별하여 적절히 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`를 부여합니다.
- 필요시 `aria-label` 또는 명시적인 `label` 매핑 상태를 점검하여 반영합니다.

## 8. 최종 검증 계획
구현이 완료된 후, 코드를 커밋하기 전 아래 항목들을 검사하여 결과를 보고합니다. `analyze.js` 스크립트는 이 검증에 사용하지 않습니다.
1. `git status --short --untracked-files=all` (임시 파일이 남아있지 않은지 검사)
2. `git diff --name-status HEAD` (허용되지 않은 파일의 조작 여부 점검)
3. `git diff --check HEAD` (후행 공백 등 포맷팅 오염 점검)
4. 변경된 파일들에 대한 개별 ESLint 점검 수행 (`npx eslint <target_files>`)
5. `npm run build`를 통한 TypeScript 및 번들링 에러 검출
6. 읽기 전용 AST 스크립트(또는 파싱)를 통해 `localization.ts` 내 ko/vi 번역 키의 대칭, 누락, 중복 여부 확인
7. 허용 파일 내부에 남아있는 `[가-힣]` 한글 잔류 여부 검색 후, 남겨진 각 예외 사항의 파일/라인/보존 사유를 리포트
8. `dangerouslySetInnerHTML`의 신규 사용 여부 확인 (절대 금지)
9. 인터랙티브 요소(button, select 등)에 `focus-visible` 적용 누락 점검
10. 한국어(KO) 및 베트남어(VI) 언어 설정에서 화면이 정상 렌더링 되는지 수동 확인
11. **모든 검증이 PASS 판정을 받기 전까지는 `git add` 및 `git commit`을 절대로 실행하지 않습니다.**
