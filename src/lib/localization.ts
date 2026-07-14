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
