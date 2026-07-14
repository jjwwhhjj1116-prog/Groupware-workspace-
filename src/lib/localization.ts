import { WorkspaceLanguage } from '@/types/models';

export const UI_MESSAGES = {
  ko: {
    // Header & Sidebar
    dashboard: '대시보드',
    projectBoard: '통합 프로젝트 보드',
    projectIntake: '수주/개발 관리',
    approvals: '결재/수정 내역',
    conflicts: '일정 충돌 관리',
    schedules: '통합 일정표',
    notifications: '알림 센터',
    settings: '운영 설정',
    myTasks: '내 업무',
    evaluation: '성과 평가',

    // Board Columns
    preWork: '착수 전',
    inProgress: '진행 중',
    completed: '완료',
    revision: '수정',

    // Board Tabs
    devTeamWork: '개발팀 작업',
    externalProject: '외부 수주 프로젝트',

    // Board Time Badges
    goal: '목표',
    delivery: '납품',
    overdue: '🚨 {label}일 경과',
    dueIn: '{time} 전',
    unset: '미정',

    // Intake
    newProjectReg: '신규 프로젝트 등록',
    orderProjectManagement: '수주 프로젝트 관리',
    devTaskListManagement: '개발팀 업무 리스트 관리',

    // Settings
    translationSettings: '번역 설정',
    workspaceSettings: '운영 환경 설정',
    personnelManagement: '사원 관리',
    bulkEdit: '일괄 마감 (Danger)',
    dataQuality: '데이터 품질 검사기',
    importPreview: '가져오기 (JSON)',
    permissions: '권한 정책 설정',

    // Translation UI Warnings
    apiWarning: '주의: 업무상 민감한 내용이 무료 외부 API 서버로 전송될 수 있습니다. 정식 운영 시에는 자체 서버 구축을 권장합니다.',
    fallbackManual: '무료 번역 한도 초과 / 수동 번역 필요',

    // Modal Tabs
    overview: '개요',

    // P4-A Added Keys
    'header.role.superAdmin': '최고관리자',
    'header.role.systemAdmin': '시스템관리자',
    'header.role.deptManager': '부서장',
    'header.role.pm': 'PM',
    'header.role.worker': '작업자',
    'header.dept.hq': '본사',
    'header.dept.none': '소속 없음',
    'header.loginRequired': '로그인 필요',
    'header.mode.real': '실사용 모드',
    'header.mode.validation': '운영 검증',
    'header.data.prefix': '데이터: ',
    'header.data.json': 'JSON 운영',
    'header.data.demo': 'Demo Seed',
    'header.data.excel': 'Excel 임포트',
    'header.data.empty': '비어 있음',
    'header.nav.approvals': '결재함',
    'header.nav.evaluation': '성과 평가',

    'notification.title': '알림',
    'notification.readAll': '모두 읽음',
    'notification.empty': '새로운 알림이 없습니다.',
    'notification.viewAll': '알림 센터 전체보기',

    'settings.title': '설정 및 내 정보',
    'settings.loginRequired': '로그인이 필요합니다.',
    'settings.section.basicInfo': '기본 정보',
    'settings.field.name': '이름',
    'settings.field.role': '권한 (Role)',
    'settings.field.department': '부서',
    'settings.field.emailMock': '이메일 (Mock)',
    'settings.section.appSettings': '앱 설정',
    'settings.theme.dark': '다크 모드',
    'settings.emailAlerts': '이메일 알림 수신',
    'settings.note.backend': '* 실제 환경 설정은 백엔드 연동 이후 반영됩니다.',

    'common.progress': '진행률',

    // P4-B Added Keys
    'dashboard.loading': 'Loading...',
    'dashboard.title': '통합 대시보드',
    'dashboard.subtitle': '기준 전체 업무 현황',
    'dashboard.filter.allMonths': '전체 월 조회',
    'common.yearMonth': '{year}년 {month}월',
    'dashboard.actions.importJson': 'JSON 불러오기',
    'dashboard.actions.exportJson': 'JSON 내보내기',

    'dashboard.metric.inProgressProject': '진행 중 프로젝트',
    'dashboard.metric.inProgressDesc': '이번 달 전체 진행 건',
    'dashboard.metric.overdueProject': '납품 경과 프로젝트',
    'dashboard.metric.overdueDesc': '납품일 1주일 이내 및 경과',
    'dashboard.metric.myTasks': '내 작업',
    'dashboard.metric.myTasksDesc': '할당된 전체 업무',
    'dashboard.metric.completedTasks': '완료된 작업',
    'dashboard.metric.completedTasksDesc': '승인 완료된 업무',
    'dashboard.metric.pending': '승인 대기',
    'dashboard.metric.pendingDesc': 'PM 검토 대기 건',
    'dashboard.metric.revision': '수정 요청 (반려)',
    'dashboard.metric.revisionDesc': '재작업이 필요한 건',

    'dashboard.sa.pendingApproval': '결재/승인 대기',
    'dashboard.sa.pendingApprovalDesc': '승인 대기 중인 문서',
    'dashboard.sa.delayedTask': '지연/충돌 업무',
    'dashboard.sa.delayedTaskDesc': '마감일 경과 또는 미처리 건',
    'dashboard.sa.projectSummary': '월별 프로젝트 요약',
    'dashboard.sa.emptyProject': '아직 표시할 프로젝트가 없습니다.',
    'dashboard.sa.emptyProjectDesc': 'JSON 데이터를 불러오거나 새 프로젝트를 등록해 주세요.',

    'dashboard.dm.deptProject': '부서 전체 프로젝트',
    'dashboard.dm.deptProjectDesc': '부서 내 진행 중인 건',
    'dashboard.dm.pendingApproval': '부서원 결재 대기',
    'dashboard.dm.pendingApprovalDesc': '부서장 승인 필요 문서',
    'dashboard.dm.emptyProject': '부서 내 진행 중인 프로젝트가 없습니다.',
    'dashboard.dm.emptyProjectDesc': '프로젝트 보드에서 새 업무를 할당받거나 생성하세요.',

    'dashboard.pm.myProject': '담당 프로젝트',
    'dashboard.pm.myProjectDesc': 'PM으로 배정된 프로젝트',
    'dashboard.pm.pendingReview': '검토 대기 업무',
    'dashboard.pm.pendingReviewDesc': '팀원 작업물 검토 대기 건',
    'dashboard.pm.emptyProject': '담당 중인 프로젝트가 없습니다.',
    'dashboard.pm.emptyProjectDesc': 'PM으로 배정된 프로젝트 내역이 이곳에 표시됩니다.',

    'dashboard.table.deliveryExpected': '납품 예정일',
    'dashboard.table.targetExpected': '목표 예정일',

    'dashboard.section.recentTasks': '최근 할당된 작업',
    'dashboard.empty.noTasks': '할당된 작업이 없습니다.',
    'dashboard.empty.noTasksDesc': 'PM이 업무를 할당하면 이곳에 표시됩니다.',
    'dashboard.table.taskName': '작업명',
    'dashboard.table.project': '프로젝트',
    'dashboard.table.projectName': '프로젝트명',
    'dashboard.table.category': '구분',
    'dashboard.table.progress': '진척도',
    'dashboard.table.status': '상태',
    'dashboard.table.dueDate': '마감일',

    'dashboard.projectType.order': '수주',
    'dashboard.projectType.internal': '내부개발',
    'common.unset': '미정',
    'dashboard.status.pending': '승인 대기',
    'dashboard.status.rejected': '반려',

    'dashboard.widget.workManagement': '업무관리',
    'dashboard.work.inProgress': '진행중',
    'dashboard.work.qcPending': 'QC대기',
    'dashboard.work.upcomingDelivery': '납품임박',
    'dashboard.work.empty': '해당하는 프로젝트가 없습니다.',
    'dashboard.work.deptPm': '부서/PM',
    'dashboard.work.targetDate': '완료예정일',
    'dashboard.work.deliveryDate': '납품일',
    'dashboard.work.progress': '진척도',
    'dashboard.work.deferredNote': '* 회의록/전화/메일/납품차수 등 상세 원본 기능은 이번 위젯에 직접 구현되지 않았습니다 (Deferred).',

    'dashboard.widget.managementSupport': '경영지원',
    'dashboard.support.tabs.notice': '공지사항',
    'dashboard.support.tabs.hr': '조직/인사',
    'dashboard.support.tabs.form': '양식함',
    'dashboard.support.noNotice': '등록된 공지사항이 없습니다.',
    'dashboard.support.important': '필독',
    'dashboard.support.hrSummary': '인사 변동 요약 (이번 달)',
    'dashboard.support.newHires': '신규 입사',
    'dashboard.support.resigned': '퇴사',
    'dashboard.support.deptStatus': '부서별 인원 현황',
    'dashboard.support.noDeptData': '부서 인원 데이터가 없습니다.',
    'dashboard.support.form.vacation': '휴가 신청서 양식',
    'dashboard.support.form.overtime': '초과근무 신청서 양식',
    'dashboard.support.download': '다운로드',
    'dashboard.support.peopleUnit': '명',
  },
  vi: {
    // Header & Sidebar
    dashboard: 'Bảng điều khiển',
    projectBoard: 'Bảng dự án tổng hợp',
    projectIntake: 'Quản lý Đặt hàng/Phát triển',
    approvals: 'Lịch sử Phê duyệt',
    conflicts: 'Quản lý Xung đột Lịch',
    schedules: 'Lịch trình tổng hợp',
    notifications: 'Trung tâm Thông báo',
    settings: 'Cài đặt Vận hành',
    myTasks: 'Công việc của tôi',
    evaluation: 'Đánh giá Hiệu suất',

    // Board Columns
    preWork: 'Chưa bắt đầu',
    inProgress: 'Đang thực hiện',
    completed: 'Hoàn thành',
    revision: 'Chỉnh sửa',

    // Board Tabs
    devTeamWork: 'Công việc đội Phát triển',
    externalProject: 'Dự án Đặt hàng ngoài',

    // Board Time Badges
    goal: 'Mục tiêu',
    delivery: 'Giao hàng',
    overdue: '🚨 Quá hạn {label}',
    dueIn: 'Trước {time}',
    unset: 'Chưa đặt',

    // Intake
    newProjectReg: 'Đăng ký dự án mới',
    orderProjectManagement: 'Quản lý Dự án Đặt hàng',
    devTaskListManagement: 'Quản lý Danh sách Công việc Phát triển',

    // Settings
    translationSettings: 'Cài đặt Dịch thuật',
    workspaceSettings: 'Cài đặt Môi trường Vận hành',
    personnelManagement: 'Quản lý Nhân sự',
    bulkEdit: 'Đóng hàng loạt (Danger)',
    dataQuality: 'Kiểm tra Chất lượng Dữ liệu',
    importPreview: 'Nhập (JSON)',
    permissions: 'Cài đặt Chính sách Quyền',

    // Translation UI Warnings
    apiWarning: 'Lưu ý: Nội dung công việc nhạy cảm có thể được gửi đến máy chủ API miễn phí bên ngoài. Khuyên dùng máy chủ nội bộ khi vận hành chính thức.',
    fallbackManual: 'Vượt quá hạn mức dịch thuật miễn phí / Cần dịch thủ công',

    // Modal Tabs
    overview: 'Tổng quan',

    // P4-A Added Keys
    'header.role.superAdmin': 'Quản trị viên cấp cao',
    'header.role.systemAdmin': 'Quản trị hệ thống',
    'header.role.deptManager': 'Trưởng phòng',
    'header.role.pm': 'Quản lý dự án',
    'header.role.worker': 'Nhân viên',
    'header.dept.hq': 'Trụ sở chính',
    'header.dept.none': 'Không có trực thuộc',
    'header.loginRequired': 'Cần đăng nhập',
    'header.mode.real': 'Chế độ sử dụng thực tế',
    'header.mode.validation': 'Kiểm chứng vận hành',
    'header.data.prefix': 'Dữ liệu: ',
    'header.data.json': 'Vận hành JSON',
    'header.data.demo': 'Demo Seed',
    'header.data.excel': 'Nhập Excel',
    'header.data.empty': 'Trống',
    'header.nav.approvals': 'Hộp phê duyệt',
    'header.nav.evaluation': 'Đánh giá hiệu suất',

    'notification.title': 'Thông báo',
    'notification.readAll': 'Đánh dấu đã đọc tất cả',
    'notification.empty': 'Không có thông báo mới.',
    'notification.viewAll': 'Xem tất cả trung tâm thông báo',

    'settings.title': 'Cài đặt và Thông tin của tôi',
    'settings.loginRequired': 'Cần đăng nhập.',
    'settings.section.basicInfo': 'Thông tin cơ bản',
    'settings.field.name': 'Tên',
    'settings.field.role': 'Quyền (Role)',
    'settings.field.department': 'Phòng ban',
    'settings.field.emailMock': 'Email (Mock)',
    'settings.section.appSettings': 'Cài đặt ứng dụng',
    'settings.theme.dark': 'Chế độ tối',
    'settings.emailAlerts': 'Nhận email thông báo',
    'settings.note.backend': '* Cài đặt môi trường thực tế sẽ được áp dụng sau khi liên kết backend.',

    'common.progress': 'Tiến độ',

    // P4-B Added Keys
    'dashboard.loading': 'Đang tải...',
    'dashboard.title': 'Bảng điều khiển tổng hợp',
    'dashboard.subtitle': 'Tình trạng công việc chung',
    'dashboard.filter.allMonths': 'Xem tất cả các tháng',
    'common.yearMonth': 'Tháng {month} năm {year}',
    'dashboard.actions.importJson': 'Nhập JSON',
    'dashboard.actions.exportJson': 'Xuất JSON',

    'dashboard.metric.inProgressProject': 'Dự án đang thực hiện',
    'dashboard.metric.inProgressDesc': 'Tổng số dự án tháng này',
    'dashboard.metric.overdueProject': 'Dự án quá hạn giao hàng',
    'dashboard.metric.overdueDesc': 'Trong vòng 1 tuần hoặc đã quá hạn',
    'dashboard.metric.myTasks': 'Công việc của tôi',
    'dashboard.metric.myTasksDesc': 'Tổng công việc được giao',
    'dashboard.metric.completedTasks': 'Công việc đã hoàn thành',
    'dashboard.metric.completedTasksDesc': 'Công việc đã phê duyệt',
    'dashboard.metric.pending': 'Chờ phê duyệt',
    'dashboard.metric.pendingDesc': 'Chờ PM xem xét',
    'dashboard.metric.revision': 'Yêu cầu chỉnh sửa',
    'dashboard.metric.revisionDesc': 'Cần làm lại',

    'dashboard.sa.pendingApproval': 'Chờ kết toán/phê duyệt',
    'dashboard.sa.pendingApprovalDesc': 'Tài liệu đang chờ phê duyệt',
    'dashboard.sa.delayedTask': 'Công việc chậm trễ/xung đột',
    'dashboard.sa.delayedTaskDesc': 'Công việc quá hạn hoặc chưa xử lý',
    'dashboard.sa.projectSummary': 'Tóm tắt dự án hàng tháng',
    'dashboard.sa.emptyProject': 'Chưa có dự án nào để hiển thị.',
    'dashboard.sa.emptyProjectDesc': 'Vui lòng tải dữ liệu JSON hoặc đăng ký dự án mới.',

    'dashboard.dm.deptProject': 'Toàn bộ dự án của phòng ban',
    'dashboard.dm.deptProjectDesc': 'Các dự án đang tiến hành trong phòng',
    'dashboard.dm.pendingApproval': 'Chờ phê duyệt của nhân viên',
    'dashboard.dm.pendingApprovalDesc': 'Tài liệu cần trưởng phòng phê duyệt',
    'dashboard.dm.emptyProject': 'Không có dự án nào đang tiến hành trong phòng.',
    'dashboard.dm.emptyProjectDesc': 'Vui lòng nhận phân công mới hoặc tạo công việc từ bảng dự án.',

    'dashboard.pm.myProject': 'Dự án phụ trách',
    'dashboard.pm.myProjectDesc': 'Dự án được phân công làm PM',
    'dashboard.pm.pendingReview': 'Công việc chờ xem xét',
    'dashboard.pm.pendingReviewDesc': 'Tài liệu chờ xem xét kết quả công việc của nhóm',
    'dashboard.pm.emptyProject': 'Không có dự án nào đang phụ trách.',
    'dashboard.pm.emptyProjectDesc': 'Lịch sử dự án được phân công làm PM sẽ được hiển thị ở đây.',

    'dashboard.table.deliveryExpected': 'Ngày giao hàng dự kiến',
    'dashboard.table.targetExpected': 'Ngày mục tiêu dự kiến',

    'dashboard.section.recentTasks': 'Công việc được giao gần đây',
    'dashboard.empty.noTasks': 'Không có công việc được giao.',
    'dashboard.empty.noTasksDesc': 'Sẽ hiển thị ở đây khi PM giao việc.',
    'dashboard.table.taskName': 'Tên công việc',
    'dashboard.table.project': 'Dự án',
    'dashboard.table.projectName': 'Tên dự án',
    'dashboard.table.category': 'Loại',
    'dashboard.table.progress': 'Tiến độ',
    'dashboard.table.status': 'Trạng thái',
    'dashboard.table.dueDate': 'Ngày đến hạn',

    'dashboard.projectType.order': 'Đặt hàng',
    'dashboard.projectType.internal': 'Phát triển nội bộ',
    'common.unset': 'Chưa đặt',
    'dashboard.status.pending': 'Chờ phê duyệt',
    'dashboard.status.rejected': 'Bị từ chối',

    'dashboard.widget.workManagement': 'Quản lý công việc',
    'dashboard.work.inProgress': 'Đang thực hiện',
    'dashboard.work.qcPending': 'Chờ QC',
    'dashboard.work.upcomingDelivery': 'Sắp giao hàng',
    'dashboard.work.empty': 'Không có dự án tương ứng.',
    'dashboard.work.deptPm': 'Phòng ban/PM',
    'dashboard.work.targetDate': 'Ngày dự kiến hoàn thành',
    'dashboard.work.deliveryDate': 'Ngày giao hàng',
    'dashboard.work.progress': 'Tiến độ',
    'dashboard.work.deferredNote': '* Các chức năng gốc chi tiết chưa được triển khai (Deferred).',

    'dashboard.widget.managementSupport': 'Hỗ trợ quản lý',
    'dashboard.support.tabs.notice': 'Thông báo',
    'dashboard.support.tabs.hr': 'Tổ chức/Nhân sự',
    'dashboard.support.tabs.form': 'Biểu mẫu',
    'dashboard.support.noNotice': 'Không có thông báo nào được đăng ký.',
    'dashboard.support.important': 'Đọc bắt buộc',
    'dashboard.support.hrSummary': 'Tóm tắt thay đổi nhân sự (Tháng này)',
    'dashboard.support.newHires': 'Nhân viên mới',
    'dashboard.support.resigned': 'Nghỉ việc',
    'dashboard.support.deptStatus': 'Hiện trạng nhân sự theo phòng ban',
    'dashboard.support.noDeptData': 'Không có dữ liệu nhân sự phòng ban.',
    'dashboard.support.form.vacation': 'Mẫu đơn xin nghỉ phép',
    'dashboard.support.form.overtime': 'Mẫu đơn xin làm thêm',
    'dashboard.support.download': 'Tải xuống',
    'dashboard.support.peopleUnit': 'người',
  }
};

export const useTranslation = (lang: WorkspaceLanguage) => {
  return (key: keyof typeof UI_MESSAGES['ko'], params?: Record<string, string>) => {
    let str = UI_MESSAGES[lang]?.[key] || UI_MESSAGES['ko'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  };
};

export const getUserDisplayName = (user: { name?: string; displayName?: string; role?: string; departmentName?: string; isKorean?: boolean } | null | undefined) => {
  if (!user) return 'Unknown';
  return user.displayName || user.name || 'Unknown';
};
