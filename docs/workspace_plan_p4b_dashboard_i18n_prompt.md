# P4-B: Dashboard i18n & A11y 구현 계획서

본 계획서는 대시보드 화면 및 관련 위젯 컴포넌트에 대한 다국어(i18n) 적용과 접근성(A11y) 처리에 대한 명세입니다.

## 1. 개요 및 목적
- **작업 목표**: 대시보드 화면 전체의 하드코딩된 한글 UI 문자열을 다국어 처리하고, 인터랙티브 요소에 `focus-visible`을 적용하여 키보드 접근성을 향상시킵니다.
- **축소 적용 배경**: 전체 애플리케이션의 하드코딩 문구를 한 번에 처리하는 것은 위험성이 높으므로, P4-A(App Shell)에 이어 P4-B에서는 **대시보드 영역**으로 한정하여 2차 i18n 작업을 수행합니다.

## 2. 작업 범위 (Scope)
- **변경 허용 파일**:
  - `src/app/page.tsx`
  - `src/components/dashboard/SuperAdminDashboard.tsx`
  - `src/components/dashboard/DepartmentManagerDashboard.tsx`
  - `src/components/dashboard/PMDashboard.tsx`
  - `src/components/dashboard/WorkerDashboard.tsx`
  - `src/components/dashboard/widgets/WorkManagementWidget.tsx`
  - `src/components/dashboard/widgets/ManagementSupportWidget.tsx`
  - `src/lib/localization.ts`
- **변경 금지 파일**:
  - `src/components/board/**`
  - `modal/form` 계열 파일 전체
  - `store` 파일 (예: `hrStore.ts` 등)
  - API/Server 파일
  - 대시보드와 무관한 공통 UI
  - P4-A에서 이미 처리한 Header/Sidebar/Settings 재수정 금지
- **Rollback 방식**: `git reset --hard 852f9f7` 및 `git clean -fd` (주의: 사용자 승인 없이 실행 금지)

## 3. i18n 적용 원칙 및 제외 기준
1. 기존 `localization.ts` 구조 및 `useTranslation` 훅을 유지합니다.
2. **P4-A 재사용**: P4-A에서 추가한 `header.role.*`, `header.dept.*`, `common.progress` 등은 중복 생성하지 않고 재사용합니다.
3. **제외 기준 (주석 및 컨텐츠 데이터)**:
   - 코드 내 주석은 UI 문자열이 아니므로 i18n 대상에서 제외합니다.
   - `hrStore` 등의 상태 관리나 데이터(예: 공지사항 제목/내용 등 fixture/content 데이터)는 UI 라벨이 아니므로 이번 P4-B 번역 대상에서 명확히 제외합니다.

## 4. i18n 문자열 Inventory (P4-B 대상)

| 파일 위치 | 한글 원문 | i18n Key 후보 | 베트남어 (초안 DRAFT) |
| --- | --- | --- | --- |
| `app/page.tsx` | Loading... | `dashboard.loading` | Đang tải... |
| `app/page.tsx` | 통합 대시보드 | `dashboard.title` | Bảng điều khiển tổng hợp |
| `app/page.tsx` | 기준 전체 업무 현황 | `dashboard.subtitle` | Tình trạng công việc chung |
| `app/page.tsx` | 전체 월 조회 | `dashboard.filter.allMonths` | Xem tất cả các tháng |
| `app/page.tsx` | {year}년 {month}월 | `common.yearMonth` (param: year, month) | Tháng {month} năm {year} |
| `app/page.tsx` | JSON 불러오기 | `dashboard.actions.importJson` | Nhập JSON |
| `app/page.tsx` | JSON 내보내기 | `dashboard.actions.exportJson` | Xuất JSON |
| `*Dashboard.tsx` | 진행 중 프로젝트 | `dashboard.metric.inProgressProject` | Dự án đang thực hiện |
| `*Dashboard.tsx` | 이번 달 전체 진행 건 | `dashboard.metric.inProgressDesc` | Tổng số dự án tháng này |
| `*Dashboard.tsx` | 납품 경과 프로젝트 | `dashboard.metric.overdueProject` | Dự án quá hạn giao hàng |
| `*Dashboard.tsx` | 납품일 1주일 이내 및 경과 | `dashboard.metric.overdueDesc` | Trong vòng 1 tuần hoặc đã quá hạn |
| `*Dashboard.tsx` | 진행 중 / 신규 요청 / 위험 | `dashboard.metric.*` (상태값별) | Đang thực hiện / Yêu cầu mới / Nguy hiểm |
| `*Dashboard.tsx` | 내 작업 / 할당된 전체 업무 | `dashboard.metric.myTasks` / `dashboard.metric.myTasksDesc` | Công việc của tôi / Tổng công việc được giao |
| `*Dashboard.tsx` | 완료된 작업 / 승인 완료된 업무 | `dashboard.metric.completedTasks` / `dashboard.metric.completedTasksDesc` | Công việc đã hoàn thành / Công việc đã phê duyệt |
| `*Dashboard.tsx` | 승인 대기 / PM 검토 대기 건 | `dashboard.metric.pending` / `dashboard.metric.pendingDesc` | Chờ phê duyệt / Chờ PM xem xét |
| `*Dashboard.tsx` | 수정 요청 (반려) / 재작업이 필요한 건 | `dashboard.metric.revision` / `dashboard.metric.revisionDesc` | Yêu cầu chỉnh sửa / Cần làm lại |
| `*Dashboard.tsx` | 최근 할당된 작업 / 부서 전체 최근 업무 동향 등 | `dashboard.section.recentTasks` 등 | Công việc được giao gần đây |
| `*Dashboard.tsx` | 할당된 작업이 없습니다 | `dashboard.empty.noTasks` | Không có công việc được giao |
| `*Dashboard.tsx` | PM이 업무를 할당하면 이곳에 표시됩니다 | `dashboard.empty.noTasksDesc` | Sẽ hiển thị ở đây khi PM giao việc |
| `*Dashboard.tsx` | 작업명 / 프로젝트 / 상태 / 마감일 | `dashboard.table.taskName` 등 | Tên công việc / Dự án / Trạng thái / Ngày đến hạn |
| `*Dashboard.tsx` | 수주 / 내부개발 | `dashboard.projectType.order` / `internal` | Đặt hàng / Phát triển nội bộ |
| `*Dashboard.tsx` | 미정 | `common.unset` | Chưa đặt |
| `*Dashboard.tsx` | 승인 대기 | `dashboard.status.pending` | Chờ phê duyệt |
| `*Dashboard.tsx` | 반려 | `dashboard.status.rejected` | Bị từ chối |
| `WorkManagementWidget.tsx`| 업무관리 | `dashboard.widget.workManagement` | Quản lý công việc |
| `WorkManagementWidget.tsx`| 진행중 / QC대기 / 납품임박 | `dashboard.work.*` | Đang thực hiện / Chờ QC / Sắp giao hàng |
| `WorkManagementWidget.tsx`| 해당하는 프로젝트가 없습니다. | `dashboard.work.empty` | Không có dự án tương ứng. |
| `WorkManagementWidget.tsx`| 부서/PM: | `dashboard.work.deptPm` | Phòng ban/PM: |
| `WorkManagementWidget.tsx`| 완료예정일 | `dashboard.work.targetDate` | Ngày dự kiến hoàn thành |
| `WorkManagementWidget.tsx`| 납품일 | `dashboard.work.deliveryDate` | Ngày giao hàng |
| `WorkManagementWidget.tsx`| 진척도: | `dashboard.work.progress` | Tiến độ: |
| `WorkManagementWidget.tsx`| * 회의록/전화/메일/납품차수 등... | `dashboard.work.deferredNote` | * Các chức năng gốc chi tiết... |
| `ManagementSupportWidget.tsx`| 경영지원 | `dashboard.widget.managementSupport` | Hỗ trợ quản lý |
| `ManagementSupportWidget.tsx`| 공지사항 / 조직/인사 / 양식함 | `dashboard.support.tabs.*` | Thông báo / Tổ chức/Nhân sự / Biểu mẫu |
| `ManagementSupportWidget.tsx`| 등록된 공지사항이 없습니다. | `dashboard.support.noNotice` | Không có thông báo nào được đăng ký. |
| `ManagementSupportWidget.tsx`| 필독 | `dashboard.support.important` | Đọc bắt buộc |
| `ManagementSupportWidget.tsx`| 인사 변동 요약 (이번 달) | `dashboard.support.hrSummary` | Tóm tắt thay đổi nhân sự (Tháng này) |
| `ManagementSupportWidget.tsx`| 신규 입사 / 퇴사 | `dashboard.support.newHires` / `resigned` | Nhân viên mới / Nghỉ việc |
| `ManagementSupportWidget.tsx`| 부서별 인원 현황 | `dashboard.support.deptStatus` | Hiện trạng nhân sự theo phòng ban |
| `ManagementSupportWidget.tsx`| 부서 인원 데이터가 없습니다. | `dashboard.support.noDeptData` | Không có dữ liệu nhân sự phòng ban. |
| `ManagementSupportWidget.tsx`| 휴가 신청서 양식 / 초과근무 신청서 양식 | `dashboard.support.form.*` | Mẫu đơn xin nghỉ phép / Mẫu đơn xin làm thêm |
| `ManagementSupportWidget.tsx`| 다운로드 | `dashboard.support.download` | Tải xuống |

*(※ P4-A에서 처리된 `본사`, `소속 없음`, `최고관리자`, `작업자` 등은 기존 키 재사용)*

## 5. 접근성(A11y) 및 Grid 변경 제한
- **A11y**: 대시보드의 **Filter Select(월 조회)**, **버튼(JSON 불러오기/내보내기)**, **위젯 탭(공지사항/인사 등)**, **링크/카드** 요소에 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]` 클래스 적용.
- **Grid 변경 제한**: 이번 P4-B에서는 기본적으로 i18n/A11y만 수행하며, Grid 등 레이아웃 변경은 금지합니다. 모바일 화면에서 실제 겹침 문제가 확인된 경우에 한해 최소 수정만 허용합니다.

## 6. 검증 계획 (Verification Plan)
필수 검증 단계:
1. **Trailing Whitespace 검사**: `git diff --check`
2. **ESLint**: 변경된 모든 파일 개별 Lint 검사 수행 (`exit code 0`, 0 errors 확인).
3. **TypeScript Build**: `cmd.exe /c "npm run build"` 실행으로 타입 불일치 여부 확인.
4. **Lint Debt 보고**: 전체 `npm run lint`는 baseline debt와 분리하여 확인 및 별도 보고.
5. **Manual Verification**: KOR/VIET 토글 후 `dashboard/page` 및 역할별(role) 대시보드 텍스트 변경 확인.

## 7. 결론
위와 같은 범위와 지침에 따라 P4-B 작업을 제안하며 구현 승인을 요청합니다.
