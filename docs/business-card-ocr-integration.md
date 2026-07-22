# 명함 OCR 주소록 연동 가이드

## 구현 구조

브라우저는 명함 이미지와 파일 정보만 사내 OCR 게이트웨이로 전송합니다. `X-OCR-SECRET` 같은 공급자 비밀키는 게이트웨이 서버 환경변수에만 보관합니다. 현재 앱은 정적 export 방식이므로 Next.js API Route 대신 `tools/business-card-ocr-gateway.mjs` 또는 동일 계약의 사내 API를 별도 배포해야 합니다.

요청 계약:

```json
{ "fileName": "card.jpg", "mimeType": "image/jpeg", "dataBase64": "..." }
```

정규화 응답 계약:

```json
{
  "contact": { "name": "", "company": "", "department": "", "position": "", "mobile": "", "telephone": "", "fax": "", "email": "", "homepage": "", "address": "" },
  "confidence": 0.97,
  "language": "ko"
}
```

## NAVER CLOVA OCR 권장 설정

1. NAVER Cloud Platform에서 CLOVA OCR을 구독합니다.
2. Document 도메인을 만들고 명함 특화 모델 사용 심사를 신청합니다.
3. API Gateway 연동 후 `/document/name-card` Invoke URL과 `X-OCR-SECRET`을 발급합니다.
4. 비밀값은 서버 환경변수에만 등록합니다.
5. `.env.local`에는 공개 가능한 게이트웨이 주소만 설정합니다.

PowerShell 로컬 실행 예시:

```powershell
$env:OCR_PROVIDER='clova'
$env:CLOVA_OCR_INVOKE_URL='https://YOUR-ID.apigw.ntruss.com/custom/v1/YOUR-DOMAIN/YOUR-KEY/document/name-card'
$env:CLOVA_OCR_SECRET='SERVER-ONLY-SECRET'
$env:OCR_ALLOWED_ORIGIN='http://localhost:3000'
$env:OCR_GATEWAY_PORT='8787'
node tools/business-card-ocr-gateway.mjs
```

앱 `.env.local`:

```text
NEXT_PUBLIC_BUSINESS_CARD_OCR_ENDPOINT=http://localhost:8787/ocr/business-card
```

공식 문서:

- [CLOVA OCR 명함 API](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocrdocumentocr-namecard)
- [CLOVA OCR 공통 설정](https://api.ncloud-docs.com/docs/ai-application-service-ocr)
- [CLOVA OCR 서비스 준비](https://guide.ncloud-docs.com/docs/clovaocr-spec)

## 베트남어 명함 확장

VIETQS의 베트남어 명함은 Google Cloud Vision `TEXT_DETECTION` 또는 `DOCUMENT_TEXT_DETECTION`을 사내 게이트웨이에 추가하는 방식을 권장합니다. Vision은 여러 언어를 한 이미지에서 인식하고 `languageHints`를 지원합니다. 공급자 호출은 서비스 계정과 Application Default Credentials를 사용하는 서버에서만 수행하고, 브라우저에 API 키나 서비스 계정 JSON을 넣지 않습니다.

- [Google Cloud Vision OCR](https://docs.cloud.google.com/vision/docs/ocr)
- [OCR 지원 언어와 languageHints](https://docs.cloud.google.com/vision/docs/languages)
- [지원 이미지 형식과 권장 해상도](https://docs.cloud.google.com/vision/docs/supported-files)

## 운영 보안 체크리스트

- HTTPS, 사내 인증 토큰, 역할 기반 접근제어를 게이트웨이에 적용
- 원본 명함 이미지는 기본적으로 저장하지 않고 OCR 직후 메모리에서 폐기
- 주소록 저장 전 사용자 검토 필수, 이메일·휴대폰 중복 시 기존 항목 갱신
- 개인정보 처리 목적·보유기간·삭제 요청 절차를 사내 정책에 명시
- OCR 요청자, 시각, 결과 상태만 감사 로그에 남기고 원문 이미지는 로그에서 제외
- 운영 Origin을 정확히 지정하고 `*` CORS를 사용하지 않음
