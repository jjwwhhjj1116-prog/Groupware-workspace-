'use client';

import Image from 'next/image';
import React from 'react';
import { Camera, Check, ContactRound, FileSearch, LoaderCircle, Mail, MapPin, Phone, RotateCcw, ScanLine, ShieldCheck, Upload } from 'lucide-react';
import { analyzeBusinessCard, type BusinessCardFields } from '@/lib/businessCardOcr';
import { useContactStore } from '@/store/contactStore';

const blank: BusinessCardFields = { name: '', company: '', department: '', position: '', mobile: '', telephone: '', fax: '', email: '', homepage: '', address: '' };
const fields: Array<{ key: keyof BusinessCardFields; label: string; placeholder: string }> = [
  { key: 'name', label: '이름', placeholder: '홍길동' }, { key: 'company', label: '회사', placeholder: '회사명' },
  { key: 'department', label: '부서', placeholder: '영업본부' }, { key: 'position', label: '직급', placeholder: '팀장' },
  { key: 'mobile', label: '휴대폰', placeholder: '010-0000-0000' }, { key: 'telephone', label: '대표·사무실 전화', placeholder: '02-0000-0000' },
  { key: 'fax', label: '팩스', placeholder: '02-0000-0000' }, { key: 'email', label: '이메일', placeholder: 'name@company.com' },
  { key: 'homepage', label: '홈페이지', placeholder: 'https://company.com' }, { key: 'address', label: '주소', placeholder: '회사 주소' },
];

export default function BusinessCardsPage() {
  const contacts = useContactStore((state) => state.contacts);
  const upsertContact = useContactStore((state) => state.upsertContact);
  const [draft, setDraft] = React.useState<BusinessCardFields>(blank);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState('');
  const [confidence, setConfidence] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const configured = Boolean(process.env.NEXT_PUBLIC_BUSINESS_CARD_OCR_ENDPOINT);

  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(''); setDraft(blank); setConfidence(0); setMessage(''); setError('');
  };

  const runOcr = async (image: File) => {
    setBusy(true); setError(''); setMessage('명함의 글자를 읽고 연락처를 분류하고 있습니다.');
    try {
      const result = await analyzeBusinessCard(image);
      setDraft(result.contact); setConfidence(result.confidence); setMessage('OCR 인식이 완료됐습니다. 저장 전에 내용을 확인해 주세요.');
    } catch (reason) {
      setMessage(''); setError(reason instanceof Error ? reason.message : '명함 인식에 실패했습니다.');
    } finally { setBusy(false); }
  };

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    if (!image) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(image); setPreview(URL.createObjectURL(image)); setDraft(blank); setConfidence(0);
    void runOcr(image);
  };

  const save = () => {
    if (!draft.name.trim() && !draft.company.trim()) { setError('이름 또는 회사 중 하나는 입력해 주세요.'); return; }
    upsertContact({ ...draft, confidence, imageName: file?.name });
    setError(''); setMessage('주소록에 등록했습니다. 같은 이메일이나 휴대폰 번호는 기존 연락처를 갱신합니다.');
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0f3c5f] via-[#0d766e] to-[#23a77d] p-6 text-white shadow-[0_24px_60px_rgba(13,87,92,.22)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-emerald-100/70"><ScanLine className="h-4 w-4" />Business card intelligence</p><h1 className="mt-3 text-[28px] font-black tracking-[-.04em] sm:text-[34px]">명함 자동등록</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/72">명함을 촬영하거나 업로드하면 OCR이 이름·회사·연락처를 추출합니다. 사람이 한 번 검토한 뒤 영업 주소록에 등록합니다.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur"><span className="text-[10px] font-black text-white/60">주소록</span><strong className="ml-3 text-2xl font-black">{contacts.length}</strong></div></div>
        <div className="mt-6 grid gap-2 text-[10px] font-black sm:grid-cols-4">{['1. 촬영·업로드', '2. OCR 인식', '3. 필드 검토', '4. 주소록 등록'].map((step, index) => <div key={step} className="rounded-xl border border-white/12 bg-white/[.08] px-3 py-2.5"><span className="mr-2 text-emerald-200">0{index + 1}</span>{step}</div>)}</div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
        <article className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_18px_42px_rgba(25,45,82,.08)]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">Capture</p><h2 className="mt-1 text-lg font-black text-[var(--color-text-main)]">명함 이미지</h2></div><span className={`rounded-full px-3 py-1 text-[9px] font-black ${configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{configured ? 'OCR 연결됨' : 'OCR 연결 필요'}</span></div>
          <label className="mt-5 flex min-h-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed border-emerald-200 bg-emerald-50/45 text-center transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-[0_18px_35px_rgba(16,130,105,.12)]">
            {preview ? <span className="relative block h-[280px] w-full"><Image src={preview} alt="업로드한 명함 미리보기" fill unoptimized className="object-contain p-3" /></span> : <span className="p-7"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-700 shadow-sm"><Camera className="h-7 w-7" /></span><strong className="mt-5 block text-sm font-black text-slate-800">명함을 촬영하거나 선택하세요</strong><span className="mt-2 block text-[11px] font-semibold leading-5 text-slate-500">JPG·PNG, 최대 10MB<br />모바일에서는 후면 카메라가 열립니다.</span></span>}
            <input type="file" accept="image/jpeg,image/png" capture="environment" onChange={onFile} className="sr-only" aria-label="명함 이미지 촬영 또는 업로드" />
          </label>
          <div className="mt-4 flex gap-2"><label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800"><Upload className="h-4 w-4" />{file ? '다른 명함 선택' : '명함 업로드'}<input type="file" accept="image/jpeg,image/png" capture="environment" onChange={onFile} className="sr-only" /></label><button type="button" onClick={reset} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-xs font-black text-[var(--color-text-sub)]"><RotateCcw className="h-4 w-4" />초기화</button></div>
          <div className="mt-4 rounded-2xl bg-[var(--color-bg)] p-4 text-[10px] font-semibold leading-5 text-[var(--color-text-sub)]"><ShieldCheck className="mb-2 h-5 w-5 text-emerald-700" />명함에는 개인정보가 포함됩니다. OCR 비밀키는 브라우저에 저장하지 않으며, 승인된 사내 게이트웨이를 통해서만 처리합니다.</div>
        </article>

        <article className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_18px_42px_rgba(25,45,82,.08)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#4e6fd8]">Review & save</p><h2 className="mt-1 text-lg font-black text-[var(--color-text-main)]">인식 결과 확인</h2></div>{confidence > 0 && <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">평균 신뢰도 {Math.round(confidence * 100)}%</span>}</div>
          {busy && <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />{message}</div>}
          {!busy && message && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><Check className="h-4 w-4" />{message}</div>}
          {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">{error}</div>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map((field) => <label key={field.key} className={field.key === 'address' ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[10px] font-black text-[var(--color-text-sub)]">{field.label}</span><input value={draft[field.key]} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm font-bold text-[var(--color-text-main)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></label>)}
          </div>
          <button type="button" onClick={save} disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#eb6300] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(235,99,0,.22)] transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"><ContactRound className="h-4 w-4" />주소록에 등록</button>
        </article>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_18px_42px_rgba(25,45,82,.08)] sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#4e6fd8]">Sales contacts</p><h2 className="mt-1 text-xl font-black text-[var(--color-text-main)]">등록된 주소록</h2></div><span className="text-xs font-black text-[var(--color-text-sub)]">{contacts.length}명</span></div>
        {contacts.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{contacts.map((contact) => <article key={contact.id} className="cc-tactile-card p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 font-black text-emerald-700">{(contact.name || contact.company).slice(0, 1)}</span><div className="min-w-0"><strong className="block truncate text-sm font-black text-[var(--color-text-main)]">{contact.name || '이름 미확인'}</strong><span className="block truncate text-[10px] font-bold text-[var(--color-text-sub)]">{contact.company}{contact.position ? ` · ${contact.position}` : ''}</span></div></div><div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-3 text-[10px] font-semibold text-[var(--color-text-sub)]">{contact.mobile && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{contact.mobile}</p>}{contact.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" />{contact.email}</p>}{contact.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{contact.address}</p>}</div></article>)}</div> : <div className="mt-5 flex min-h-[170px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] text-center"><div><FileSearch className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-black text-[var(--color-text-main)]">등록된 명함이 없습니다</p><p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">첫 명함을 촬영해 영업 주소록을 시작하세요.</p></div></div>}
      </section>
    </div>
  );
}
