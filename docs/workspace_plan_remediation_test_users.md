# Remediation Plan: Test Users and Data Synchronization

## 1. 전용 테스트 계정 신규 추가 방안
기존 사용자의 권한을 변경하는 방안을 폐기하고, 기존 사용자 및 조직 권한은 그대로 보존한 채로 두 명의 전용 테스트 계정을 신규 추가합니다.

- **PM 테스트 계정**:
```json
{
  "id": "user-pm-structure-vn",
  "name": "[TEST] Structure PM",
  "displayName": "[TEST] Structure PM",
  "companyId": "VIET_QS",
  "departmentId": "dept-structure-vn",
  "role": "PM",
  "systemRole": "PM",
  "employmentStatus": "ACTIVE",
  "isActive": true,
  "organizationRank": "TEAM_LEADER"
}
```

- **Worker 테스트 계정**:
```json
{
  "id": "user-ly-thanh-phong",
  "name": "Ly Thanh Phong",
  "displayName": "[TEST] Ly Thanh Phong",
  "companyId": "VIET_QS",
  "departmentId": "dept-structure-vn",
  "role": "WORKER",
  "systemRole": "WORKER",
  "employmentStatus": "ACTIVE",
  "isActive": true,
  "organizationRank": "STAFF"
}
```

## 2. 수정 대상 파일 제한
테스트 계정 추가를 위해 다음 파일만 수정하며, 그 외의 소스 코드는 일절 변경하지 않습니다.
- `src/data/dummyPersonnel.json`
- `json/personnel-cards.json`
- `docs/workspace_plan_remediation_test_users.md`

**(수정 금지 파일)**: `src/data/workspaceScheduleSeed.ts`, `src/data/fullScheduleSeed.ts`, store 및 권한 제어 코드, 기타 모든 소스.

## 3. 시드 파일을 수정하지 않는 이유
`fullScheduleSeed.ts` 파일에는 이미 프로젝트의 `pmId`로 `user-pm-structure-vn`이 사용되고 있으며, 작업(Task)의 `assigneeId`로 `user-ly-thanh-phong`이 지정되어 있습니다. 따라서 이 아이디들을 가진 테스트 사용자만 인사 정보 JSON 파일에 추가하면, 로직 수정이나 시드 데이터 변경 없이 기존 데모 데이터와 자동으로 연동됩니다.

## 4. 운영 환경 미치는 영향
`dummyPersonnel.json`은 `JSON_OPERATION_DATA`와 `mockUsers` 모두에서 사용되므로, 수정 시 배포된 정적 사이트의 헤더 계정 선택 목록에 해당 테스트 계정들이 노출됩니다.
- 서버 DB에 직접적인 변경을 가하지는 않지만, UI 상의 사용자 목록에는 표시되는 영향이 있습니다.
- 이를 명확히 구분하기 위해 `displayName`에 `[TEST]` 접두사를 붙입니다.

## 5. 관리자 검증 모드 전환 및 정확한 UI 검증 순서
1. 헤더의 계정 Select에서 **현동명**을 선택합니다.
2. 헤더에 있는 **관리자 검증 모드** 버튼을 클릭합니다.
3. 좌측 메뉴를 통해 `/workspace/settings/workspace`로 이동합니다.
4. **데모 데이터 주입** 버튼을 클릭하여 데모 시드 데이터를 활성화합니다.
5. 메인 대시보드(`/workspace`)로 복귀합니다.
6. 헤더의 계정 Select에서 방금 추가한 **PM** 또는 **Worker** 테스트 계정으로 권한을 전환하고 화면을 검증합니다.

## 6. Worker 검증 기대값
- 내 작업 수 표시
- 최근 작업 표 표출
- 본인 `assigneeId` 작업만 표시됨을 확인
- `WorkManagementWidget`의 본인 작업 관련 프로젝트 필터 동작 확인
- `ManagementSupportWidget`에서 **HR 탭 비노출** 확인

## 7. PM 검증 기대값
- `pmId`가 `user-pm-structure-vn`인 프로젝트 표시 확인
- 프로젝트 보드 정상 접근 확인
- 프로젝트 편집 권한 동작 확인
- `ManagementSupportWidget`에서 **HR 탭 비노출** 확인

## 8. 정적 데이터 검증
- `npm run build` 실행 확인
- 두 JSON 전체 SHA-256 일치 여부 검사
- 중복 ID 0건 확인
- PM 프로젝트 연결 건수 확인
- Worker 작업 연결 건수 확인
- `git diff --check HEAD` 실행
- EOF newline 검사

## 9. 안전 규칙 및 롤백
- Codex PASS 전 소스 수정, `git add`, `git commit`, `git push`, PR, Merge, Deploy를 엄격히 금지합니다.
- `stash@{0}` 조작은 절대 금지됩니다.
