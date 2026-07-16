# Release & Deployment Plan

이 문서는 로컬 통합 브랜치(`integration/baseline`)의 최종본을 원격 `main` 브랜치에 안전하게 병합하고, GitHub Pages에 배포하기 위한 절차와 롤백 계획을 정의합니다.

현재 `integration/baseline` 브랜치는 `main` 대비 8개의 커밋이 앞서 있으며, P4~P5에 이르는 방대한 i18n(다국어) 작업과 컴포넌트 개선 사항이 포함되어 있습니다.

> [!CAUTION]
> Codex의 최종 승인(PASS)이 떨어지기 전까지는 어떠한 Push, Merge, Deploy도 실행하지 않습니다.

---

## 0. Plan Document Commit
현재 untracked 상태인 본 계획서는 다음과 같이 처리합니다.
- Codex가 수정된 계획서를 **PASS**한 뒤 해당 문서 단독으로 커밋을 진행합니다.
- `git add .` 사용은 엄격히 금지되며 소스 파일은 어떠한 변경도 하지 않습니다.
- 문서 커밋 후 최종 로컬 HEAD를 보고하여 상태를 동기화합니다.

## 1. Preflight Gate
배포 절차 착수 전 다음 명령어를 통해 환경을 검증합니다.
- `git fetch origin`
- `git rev-parse origin/main`
- `git rev-parse integration/baseline`
- `git status --short --branch`
- `git stash list`
- `npm run build`
- `git diff --check HEAD`

**중단 조건**: `origin/main`이 예상 기준(`8659ff4`)과 달라졌을 경우 즉시 중단하고 재검수를 요청합니다.
- `stash@{0}` 조작은 절대 금지됩니다.

## 2. 배포 전 로컬 수동 검증 Gate
로컬 환경(`http://localhost:3000/workspace`)에서 프로덕션 배포 전 필수 검증을 수행합니다. 검증 결과와 발견된 문제는 표로 기록하여 보고합니다.

| 검증 항목 | 대상 경로/기능 | 결과/이슈 |
|---|---|---|
| 메인 대시보드 | /workspace | |
| 주요 라우트 | /workspace/projects, approvals, schedules, settings | |
| 권한별 화면 | Admin, PM, Worker | |
| 다국어 전환 | KO/VI 토글 및 새로고침 후 유지 상태 | |
| 클라이언트 라우팅 | 하위 URL 직접 접속 및 F5 새로고침 | |
| 레이아웃 | 데스크톱 / 모바일 반응형 검증 | |
| 브라우저 콘솔 오류 | Runtime / Hydration / 번역 키 렌더링 오류 검사 | |

## 3. 원격 브랜치 Push
로컬의 통합 코드를 원격 저장소에 신규 브랜치로 반영합니다.
- **명령어**: `git push -u origin integration/baseline`
- 강제 푸시(`force push`)는 금지됩니다.
- Push 완료 후 원격 브랜치의 HEAD와 로컬 HEAD가 정확히 일치하는지 확인합니다.

## 4. Pull Request (PR) Gate
`main`에 직접 Push하는 것은 금지되며, 반드시 PR을 통합니다.
- GitHub에 접속하여 `integration/baseline` -> `main` PR을 생성합니다.
- **보고 사항**: PR URL, base/head SHA, 변경 파일 수, 충돌 여부, Checks(CI) 통과 여부.
- **Merge 조건**: PR이 열린 상태에서 Codex의 최종 PR 검수 **PASS**를 받아야만 Merge를 수행합니다.

## 5. 병합(Merge) 전략
병합 방식은 단계별 통합 이력(8개 커밋)을 보존하기 위해 **Create a merge commit**을 기본으로 사용합니다.
- 저장소 권한 정책상 불가능한 경우에 한하여 예외적으로 Squash를 사용할 수 있으며, 이 경우 사전에 보고 후 승인을 받습니다.

## 6. GitHub Actions Deployment
`main` 브랜치로 병합이 완료되면 GitHub Actions 파이프라인 진행 상태를 점검합니다.
- **Workflow 명칭**: `Deploy Next.js site to Pages`
- **필수 확인 Job**: `build`, `deploy` 두 Job이 모두 **Success**로 완료되어야만 배포 성공으로 판정합니다.

## 7. Post-Deployment Verification
배포 완료 후 단순한 HTTP 200 응답 확인에 그치지 않고 심층 검증을 수행합니다.
- **공개 대상 URL**: https://eumditravel-oss.github.io/workspace/
- **점검 포인트**:
  - Actions 배포에 사용된 SHA가 병합 커밋(Merge Commit)의 SHA와 일치하는지 확인.
  - 통합본의 신규 대시보드 위젯과 KO/VI 번역 결과가 실제 표출되는지 확인.
  - 주요 하위 경로로 딥링크(직접 접속) 및 F5 새로고침 수행 시 정상 작동 여부 검증.
  - 프로덕션 콘솔 오류 유무 점검 및 모바일 환경에서의 레이아웃 검증 결과를 종합하여 제출합니다.

## 8. Rollback 절차
강제 리셋이나 Force Push 없는 안전한 Revert 방식을 채택합니다.
- **Revert PR**: Merge Commit을 되돌리는 새로운 Pull Request를 생성합니다.
- 생성된 Revert PR 또한 사용자(Codex)의 승인을 거친 뒤 병합합니다.
- 로컬의 `integration/baseline` 브랜치와 `stash@{0}` 환경은 그대로 보존되어 원인 분석에 활용됩니다.
