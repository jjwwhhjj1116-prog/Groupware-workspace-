import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBusinessCardOcr, parseBusinessCardText } from './businessCardOcr';

test('normalizes CLOVA name-card fields into the ERP contact schema', () => {
  const result = normalizeBusinessCardOcr({ images: [{ nameCard: { meta: { estimatedLanguage: 'ko' }, result: { name: [{ text: '홍길동', confidenceScore: 0.98 }], company: [{ text: 'CON-COST', confidenceScore: 0.96 }], department: [{ text: '영업팀', confidenceScore: 0.95 }], position: [{ text: '팀장', confidenceScore: 0.94 }], mobile: [{ text: '010-1234-5678', confidenceScore: 0.99 }], email: [{ text: 'hong@example.com', confidenceScore: 0.99 }] } } }] });
  assert.equal(result.contact.name, '홍길동');
  assert.equal(result.contact.company, 'CON-COST');
  assert.equal(result.contact.mobile, '010-1234-5678');
  assert.equal(result.language, 'ko');
  assert.ok(result.confidence > 0.9);
});

test('extracts common contact fields from unstructured OCR text', () => {
  const result = parseBusinessCardText('홍길동\n(주)컨코스트\n서울특별시 강남구 테헤란로 1\nM 010-1234-5678\nhong@example.com\nwww.example.com');
  assert.equal(result.name, '홍길동');
  assert.equal(result.company, '(주)컨코스트');
  assert.equal(result.email, 'hong@example.com');
  assert.equal(result.mobile, '010-1234-5678');
});
