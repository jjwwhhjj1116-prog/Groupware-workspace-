export type BusinessCardFields = {
  name: string;
  company: string;
  department: string;
  position: string;
  mobile: string;
  telephone: string;
  fax: string;
  email: string;
  homepage: string;
  address: string;
};

export type BusinessCardOcrResult = {
  contact: BusinessCardFields;
  confidence: number;
  language?: string;
  rawText?: string;
};

const emptyContact = (): BusinessCardFields => ({ name: '', company: '', department: '', position: '', mobile: '', telephone: '', fax: '', email: '', homepage: '', address: '' });
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function firstField(value: unknown) {
  const item = record(list(value)[0]);
  return item ? text(item.text) || text(record(item.formatted)?.value) : '';
}

function confidenceOf(result: Record<string, unknown>) {
  const values = Object.values(result).flatMap((value) => list(value)).map(record).filter((value): value is Record<string, unknown> => Boolean(value)).map((value) => Number(value.confidenceScore)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function parseBusinessCardText(rawText: string): BusinessCardFields {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const homepage = rawText.match(/(?:https?:\/\/|www\.)[^\s]+/i)?.[0] || '';
  const phones = Array.from(rawText.matchAll(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{4}/g)).map((match) => match[0].trim());
  const mobile = phones.find((phone) => /(?:010|\+?82[\s.-]?10)/.test(phone)) || '';
  const telephone = phones.find((phone) => phone !== mobile) || '';
  const contentLines = lines.filter((line) => !line.includes('@') && !line.includes(homepage) && !phones.some((phone) => line.includes(phone)));
  const companyIndex = contentLines.findIndex((line) => /(주식회사|\(주\)|회사|건축|엔지니어링|CON.?COST|VIETQS|CO\.?|CORP|COMPANY|LTD)/i.test(line));
  const company = companyIndex >= 0 ? contentLines[companyIndex] : contentLines[1] || '';
  const name = contentLines.find((line, index) => index !== companyIndex && !/주소|TEL|FAX|MOBILE|EMAIL|WEB|부서|팀|본부/i.test(line) && line.length <= 30) || '';
  const address = lines.find((line) => /(특별시|광역시|도 |시 |군 |구 |로 |길 |street|road|district)/i.test(line)) || '';
  return { ...emptyContact(), name, company, mobile, telephone, email, homepage, address };
}

export function normalizeBusinessCardOcr(payload: unknown): BusinessCardOcrResult {
  const root = record(payload);
  if (!root) throw new Error('OCR 응답 형식이 올바르지 않습니다.');
  const normalized = record(root.contact);
  if (normalized) {
    const contact = emptyContact();
    for (const key of Object.keys(contact) as Array<keyof BusinessCardFields>) contact[key] = text(normalized[key]);
    return { contact, confidence: Math.max(0, Math.min(1, Number(root.confidence) || 0)), language: text(root.language), rawText: text(root.rawText) };
  }

  const image = record(list(root.images)[0]);
  const nameCard = record(image?.nameCard);
  const result = record(nameCard?.result);
  if (result) {
    return {
      contact: {
        name: firstField(result.name), company: firstField(result.company), department: firstField(result.department), position: firstField(result.position),
        mobile: firstField(result.mobile), telephone: firstField(result.tel), fax: firstField(result.fax), email: firstField(result.email), homepage: firstField(result.homepage), address: firstField(result.address),
      },
      confidence: confidenceOf(result),
      language: text(record(nameCard?.meta)?.estimatedLanguage),
    };
  }

  const response = record(list(root.responses)[0]);
  const rawText = text(root.rawText) || text(record(response?.fullTextAnnotation)?.text) || firstField(response?.textAnnotations);
  if (rawText) return { contact: parseBusinessCardText(rawText), confidence: 0, rawText };
  throw new Error('명함에서 인식된 연락처 정보가 없습니다.');
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeBusinessCard(file: File): Promise<BusinessCardOcrResult> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('JPG 또는 PNG 명함 이미지만 사용할 수 있습니다.');
  if (file.size > 10 * 1024 * 1024) throw new Error('명함 이미지는 10MB 이하여야 합니다.');
  const endpoint = process.env.NEXT_PUBLIC_BUSINESS_CARD_OCR_ENDPOINT;
  if (!endpoint) throw new Error('OCR 게이트웨이가 설정되지 않았습니다. docs/business-card-ocr-integration.md를 확인해 주세요.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64: await fileToBase64(file) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(text(record(payload)?.message) || `OCR 요청에 실패했습니다. (${response.status})`);
  return normalizeBusinessCardOcr(payload);
}
