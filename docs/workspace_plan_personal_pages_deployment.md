# Personal Pages Deployment Plan

## 1. 개요
새 배포 대상 저장소(`personal`)의 GitHub Pages 경로는 `/Groupware-workspace-`로 변경됩니다. `next.config.ts`는 수정하지 않으며, GitHub Actions 파이프라인(`deploy.yml`)에서 출력된 환경변수를 통해 동적 경로를 주입합니다.

## 2. `.github/workflows/deploy.yml` 변경 방안
소스 코드(`next.config.ts` 등)를 전혀 수정하지 않고 파이프라인 구성을 다음과 같이 보완합니다.
- `Setup Pages` 단계에 `id: pages` 속성 부여.
- `Build with Next.js` 단계에 환경변수 주입: `NEXT_PUBLIC_BASE_PATH: ${{ steps.pages.outputs.base_path }}`.
- 업로드 액션을 최신 버전으로 갱신: `actions/upload-pages-artifact@v3` -> `@v4`.

## 3. GitHub Pages 설정 Gate (사용자 수행 필수)
원격 저장소 배포가 정상 동작하려면 사전에 GitHub 리포지토리 환경 설정이 완료되어야 합니다.
- **설정 경로**: `Settings > Pages > Build and deployment > Source`
- **필수 조치**: 소스를 반드시 **`GitHub Actions`**로 변경.
- 🚨 **주의**: 절대로 `Deploy from a branch`를 선택하거나 `integration/baseline`을 배포 브랜치로 선택하여 Save해서는 안 됩니다.

## 4. 전체 배포 순서 명시
A. Workflow 로직 구현 및 로컬 터미널 검증
B. Codex PASS 판정 후 로컬 커밋 (`integration/baseline`에 추가)
C. `personal/integration/baseline` 브랜치로 Push
D. 로컬 및 원격 간 SHA 일치 여부 확인
E. 사용자 및 Codex 최종 승인 후 최초 `main` 브랜치 생성: `git push personal integration/baseline:main` (오류 시 강제 푸시 절대 금지 및 즉시 중단 후 보고)
F. GitHub Actions의 Build 및 Deploy 성공 결과 확인
G. 공개 URL 정상 렌더링 검증: `https://jjwwhhjj1116-prog.github.io/Groupware-workspace-/`

## 5. 로컬 검증 항목 보강
파이프라인 적용 전, 로컬 환경(PowerShell)에서 경로 치환이 정상 동작하는지 테스트합니다.
1. `$env:NEXT_PUBLIC_BASE_PATH = "/Groupware-workspace-"`로 환경변수 주입 후 `npm run build` 성공 확인.
2. `out/index.html` 내 스크립트 및 에셋 경로가 `/Groupware-workspace-/_next/`를 참조하는지 확인.
3. `out/index.html` 내 기존 `/workspace/_next/` 경로의 잔류 참조가 없는지 확인.
4. `out` 폴더 내에 참조 대상이 되는 실제 파일 및 폴더가 존재하는지 확인.
5. 환경변수 완전 제거 명령 실행: `Remove-Item Env:NEXT_PUBLIC_BASE_PATH -ErrorAction SilentlyContinue`
6. `Test-Path Env:NEXT_PUBLIC_BASE_PATH` 실행 (예상 결과: `False` - 완전 제거 여부 확인).
7. 환경변수 제거 상태의 기본 환경에서 다시 `npm run build` 실행 시, 기존 `/workspace` 경로로 정상 로컬 빌드가 유지되는지 확인.
8. `git diff --check HEAD`로 공백 검사.

## 6. 안전 규칙 및 한계
- **변경 허용 파일**: `.github/workflows/deploy.yml` 및 현재 문서(`docs/workspace_plan_personal_pages_deployment.md`) 단 2개 파일.
- **보존 원칙**: 기존 `origin` 원격 주소 및 `stash@{0}` 영역은 일절 조작하지 않으며 그대로 보존.
- **금지 원칙**: 배포 계획서에 대한 재검수(PASS) 완료 및 승인 전까지는 실제 소스 구현, 커밋, Push, `main` 브랜치 생성 작업이 전면 금지됩니다.
