import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.OCR_GATEWAY_PORT || 8787);
const allowedOrigin = process.env.OCR_ALLOWED_ORIGIN || 'http://localhost:3000';
const provider = process.env.OCR_PROVIDER || 'clova';
const maxBody = 14 * 1024 * 1024;

const send = (response, status, body, origin = allowedOrigin) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  request.on('data', (chunk) => { size += chunk.length; if (size > maxBody) { reject(new Error('이미지는 10MB 이하여야 합니다.')); request.destroy(); return; } chunks.push(chunk); });
  request.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('요청 JSON을 읽지 못했습니다.')); } });
  request.on('error', reject);
});

const first = (value) => Array.isArray(value) && value[0] ? String(value[0].text || value[0].formatted?.value || '').trim() : '';
const normalizeClova = (payload) => {
  const image = payload?.images?.[0]; const result = image?.nameCard?.result;
  if (!result || image?.inferResult !== 'SUCCESS') throw new Error(image?.message || 'CLOVA OCR가 명함을 인식하지 못했습니다.');
  const scores = Object.values(result).flatMap((value) => Array.isArray(value) ? value : []).map((item) => Number(item?.confidenceScore)).filter(Number.isFinite);
  return { contact: { name: first(result.name), company: first(result.company), department: first(result.department), position: first(result.position), mobile: first(result.mobile), telephone: first(result.tel), fax: first(result.fax), email: first(result.email), homepage: first(result.homepage), address: first(result.address) }, confidence: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0, language: image.nameCard?.meta?.estimatedLanguage || '' };
};

async function clovaOcr(input) {
  const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL; const secret = process.env.CLOVA_OCR_SECRET;
  if (!invokeUrl || !secret) throw new Error('CLOVA_OCR_INVOKE_URL 또는 CLOVA_OCR_SECRET이 설정되지 않았습니다.');
  if (!invokeUrl.startsWith('https://')) throw new Error('CLOVA OCR Invoke URL은 HTTPS여야 합니다.');
  const format = input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/jpeg' ? 'jpg' : '';
  if (!format) throw new Error('JPG 또는 PNG 이미지만 사용할 수 있습니다.');
  const result = await fetch(invokeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': secret }, body: JSON.stringify({ version: 'V2', requestId: randomUUID(), timestamp: Date.now(), images: [{ format, name: input.fileName || 'business-card', data: input.dataBase64 }] }) });
  const payload = await result.json().catch(() => null);
  if (!result.ok) throw new Error(payload?.message || `CLOVA OCR 요청 실패 (${result.status})`);
  return normalizeClova(payload);
}

const mockOcr = () => ({ contact: { name: '김컨코', company: 'CON-COST', department: '영업본부', position: '팀장', mobile: '010-1234-5678', telephone: '02-1234-5678', fax: '', email: 'sales@concost.example', homepage: 'https://concost.example', address: '서울특별시' }, confidence: 0.97, language: 'ko' });

createServer(async (request, response) => {
  const origin = request.headers.origin || allowedOrigin;
  if (origin !== allowedOrigin) return send(response, 403, { message: '허용되지 않은 Origin입니다.' }, allowedOrigin);
  if (request.method === 'OPTIONS') return send(response, 204, {}, origin);
  if (request.method !== 'POST' || request.url !== '/ocr/business-card') return send(response, 404, { message: '경로를 찾을 수 없습니다.' }, origin);
  try {
    const input = await readBody(request);
    if (!input?.dataBase64) throw new Error('명함 이미지가 없습니다.');
    const result = provider === 'mock' ? mockOcr() : await clovaOcr(input);
    send(response, 200, result, origin);
  } catch (error) { send(response, 400, { message: error instanceof Error ? error.message : 'OCR 처리에 실패했습니다.' }, origin); }
}).listen(port, '127.0.0.1', () => console.log(`Business card OCR gateway listening on http://127.0.0.1:${port}`));
