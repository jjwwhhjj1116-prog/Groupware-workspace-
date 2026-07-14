# CON-COST × VIET QS 통합 그룹웨어 - P4-A 구현 계획서 (App Shell & Design)

## 1. P4-A 축소 범위 및 목표
본 계획서는 전체 P4 요구사항 중 **P4-A (App Shell 및 공통 레이아웃)** 범위로 축소하여 i18n 추출, 접근성, 반응형 점검을 수행하기 위해 작성되었습니다.

**P4-A 대상:**
- App shell 레이아웃 (`Sidebar.tsx`, `Header.tsx`, `NotificationPopover.tsx`)
- Settings 페이지 (`src/app/settings/page.tsx` 내부 테마/언어 설정 UI)
- 공통 UI (`src/components/ui/` 하위 `button.tsx`, `input.tsx`, `select.tsx`, `ProgressBar.tsx` 등)
- *참고: P4-B(Dashboard/Board) 및 P4-C(Modal/Form/Alert)는 이번 범위에서 제외됩니다.*

## 2. Baseline 검증 정보 (Verification Info)
- **Branch**: `integration/baseline`
- **HEAD Commit**: `5002eebd34f1f2045f666ba670bf89be7b9b2141`
- **Git Status**: `Untracked files present: docs/workspace_plan_p4_app_shell_design_i18n_prompt.md`
- **Build 결과**: `npm run build` 성공 확인됨
- **Lint 결과**: 전체 lint 실패 (기존 baseline debt에 해당, `lint_debt_issue.md` 참고)
- **변경 허용 파일**:
  - `src/components/layout/*.tsx`
  - `src/app/settings/page.tsx`
  - `src/components/ui/*.tsx`
  - `src/lib/localization.ts`
- **변경 금지 파일**: `src/components/dashboard/**/*.tsx`, `src/components/board/**/*.tsx`, 모달 및 폼 관련 화면
- **Rollback 방식**: `git reset --hard 5002eebd34f1f2045f666ba670bf89be7b9b2141` 및 `git clean -fd` (주의: 사용자 승인 없이 실행 금지 / Rollback command is documented only and must not be executed without user approval)

## 3. i18n 적용 원칙
1. 기존 `localization.ts` 구조(`UI_MESSAGES.ko`, `UI_MESSAGES.vi`) 및 `useTranslation` 훅을 그대로 유지합니다.
2. 기존 key를 임의로 삭제하거나 수정하지 않습니다.
3. Key Naming 규칙: `[category].[sub-category].[item]` 형태를 사용합니다. (예: `header.role.superAdmin`, `settings.theme.dark`, `common.progress`)
4. 업무 도메인의 상태값(enum) 자체는 무리하게 번역 구조체에 넣지 않고, 별도의 표시용 라벨 매핑 구조를 유지합니다.
5. 적용 중 타입 오류가 발생하지 않도록 key 추가 후 반드시 `npm run build`로 타입 검증을 수행합니다.

## 4. 접근성(Accessibility) 및 반응형(Responsive) 범위 구체화
**접근성(A11y)**:
- 전역 무분별 추가가 아닌 **Header 버튼**, **Sidebar 링크**, **공통 Button/Input/Select**에 한정하여 적용합니다.
- `focus-visible` 기준으로 추가하며, 기존 `hover`/`active` 스타일을 덮어쓰거나 깨뜨리지 않는 최소한의 변경을 원칙으로 합니다. (`focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none` 형태 권장)

**반응형(Responsive)**:
- Dashboard의 전체 grid 재작성은 금지합니다.
- **모바일/태블릿 화면에서 좌측 Sidebar와 우측 콘텐츠 영역이 겹치는지 여부만 점검 및 방어**합니다.
- 시각 QA 기준: Desktop(1440px), Tablet(768px), Mobile(390px).

## 5. i18n 문자열 Inventory (P4-A 대상)

| 파일 경로 | 하드코딩 문자열 예시 | UI 위치 | i18n Key 후보 | KO 값 | VI 초안 값 | 번역 상태 | P4-A 포함 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Header.tsx` | '최고관리자' | 헤더 유저 정보 | `header.role.superAdmin` | 최고관리자 | Quản trị viên cấp cao | DRAFT | Y |
| `Header.tsx` | '시스템관리자' | 헤더 유저 정보 | `header.role.systemAdmin` | 시스템관리자 | Quản trị hệ thống | DRAFT | Y |
| `Header.tsx` | '부서장' | 헤더 유저 정보 | `header.role.deptManager` | 부서장 | Trưởng phòng | DRAFT | Y |
| `Header.tsx` | '작업자' | 헤더 유저 정보 | `header.role.worker` | 작업자 | Nhân viên | DRAFT | Y |
| `Header.tsx` | '본사' | 헤더 유저 정보 | `header.dept.hq` | 본사 | Trụ sở chính | DRAFT | Y |
| `Header.tsx` | '소속 없음' | 헤더 유저 정보 | `header.dept.none` | 소속 없음 | Không có trực thuộc | DRAFT | Y |
| `Header.tsx` | '로그인 필요' | 헤더 유저 정보 | `header.loginRequired` | 로그인 필요 | Cần đăng nhập | DRAFT | Y |
| `Header.tsx` | '실사용 모드' | 상단 모드 토글 | `header.mode.real` | 실사용 모드 | Chế độ sử dụng thực tế | DRAFT | Y |
| `Header.tsx` | '운영 검증' | 상단 모드 토글 | `header.mode.validation` | 운영 검증 | Kiểm chứng vận hành | DRAFT | Y |
| `Header.tsx` | '데이터: ' | 데이터 소스 배지 | `header.data.prefix` | 데이터: | Dữ liệu: | DRAFT | Y |
| `Header.tsx` | 'JSON 운영' | 데이터 소스 배지 | `header.data.json` | JSON 운영 | Vận hành JSON | DRAFT | Y |
| `Header.tsx` | 'Demo Seed' | 데이터 소스 배지 | `header.data.demo` | Demo Seed | Demo Seed | DRAFT | Y |
| `Header.tsx` | 'Excel 임포트' | 데이터 소스 배지 | `header.data.excel` | Excel 임포트 | Nhập Excel | DRAFT | Y |
| `Header.tsx` | '비어 있음' | 데이터 소스 배지 | `header.data.empty` | 비어 있음 | Trống | DRAFT | Y |
| `Header.tsx` | '결재함' | 우측 네비게이션 | `header.nav.approvals` | 결재함 | Hộp phê duyệt | DRAFT | Y |
| `Header.tsx` | '성과 평가' | 우측 네비게이션 | `header.nav.evaluation` | 성과 평가 | Đánh giá hiệu suất | DRAFT | Y |
| `NotificationPopover.tsx` | '알림' | 팝오버 헤더 | `notification.title` | 알림 | Thông báo | DRAFT | Y |
| `NotificationPopover.tsx` | '모두 읽음' | 팝오버 버튼 | `notification.readAll` | 모두 읽음 | Đánh dấu đã đọc tất cả | DRAFT | Y |
| `NotificationPopover.tsx` | '새로운 알림이 없습니다.' | 팝오버 빈 상태 | `notification.empty` | 새로운 알림이 없습니다. | Không có thông báo mới. | DRAFT | Y |
| `NotificationPopover.tsx` | '알림 센터 전체보기' | 팝오버 푸터 | `notification.viewAll` | 알림 센터 전체보기 | Xem tất cả trung tâm thông báo | DRAFT | Y |
| `settings/page.tsx` | '로그인이 필요합니다.' | 인증 오류 메시지 | `settings.loginRequired` | 로그인이 필요합니다. | Cần đăng nhập | DRAFT | Y |
| `settings/page.tsx` | '설정 및 내 정보' | 페이지 제목 | `settings.title` | 설정 및 내 정보 | Cài đặt và Thông tin của tôi | DRAFT | Y |
| `settings/page.tsx` | '기본 정보' | 카드 제목 | `settings.section.basicInfo` | 기본 정보 | Thông tin cơ bản | DRAFT | Y |
| `settings/page.tsx` | '이름' | 폼 라벨 | `settings.field.name` | 이름 | Tên | DRAFT | Y |
| `settings/page.tsx` | '권한 (Role)' | 폼 라벨 | `settings.field.role` | 권한 (Role) | Quyền (Role) | DRAFT | Y |
| `settings/page.tsx` | '부서' | 폼 라벨 | `settings.field.department` | 부서 | Phòng ban | DRAFT | Y |
| `settings/page.tsx` | '이메일 (Mock)' | 폼 라벨 | `settings.field.emailMock` | 이메일 (Mock) | Email (Mock) | DRAFT | Y |
| `settings/page.tsx` | '앱 설정' | 카드 제목 | `settings.section.appSettings` | 앱 설정 | Cài đặt ứng dụng | DRAFT | Y |
| `settings/page.tsx` | '다크 모드' | 설정 항목 | `settings.theme.dark` | 다크 모드 | Chế độ tối | DRAFT | Y |
| `settings/page.tsx` | '이메일 알림 수신' | 설정 항목 | `settings.emailAlerts` | 이메일 알림 수신 | Nhận email thông báo | DRAFT | Y |
| `settings/page.tsx` | '* 실제 환경 설정은 백엔드...'| 설정 안내문 | `settings.note.backend` | * 실제 환경 설정은 백엔드 연동 이후 반영됩니다. | * Cài đặt môi trường thực tế sẽ được áp dụng sau khi liên kết backend. | DRAFT | Y |
| `ProgressBar.tsx` | '진행률' | 프로그레스 바 라벨 | `common.progress` | 진행률 | Tiến độ | DRAFT | Y |

## 6. 결론 및 요청 사항
위와 같이 P4-A 범위로 한정한 i18n 추출/반응형/접근성 구현 계획을 수립하였으며, 자동 번역된 베트남어 값은 모두 **DRAFT** 처리하였습니다.
이에 따라 **P4-A Implementation Approval**을 요청합니다.
