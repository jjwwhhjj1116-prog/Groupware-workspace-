import { Archive, ChevronRight, FileText, Inbox, Mail, Paperclip, PenLine, Search, Send, Star } from 'lucide-react';

const messages = [
  { sender: '경영지원본부', subject: '7월 정기회의 자료 공유', preview: '이번 달 주요 안건과 사전 검토 자료를 첨부합니다.', time: '09:42', unread: true, tag: '공지' },
  { sender: '마감팀 · 박용진', subject: '송파 복합시설 견적 검토 요청', preview: 'OFFDAY2 견적서 2차 검토 의견을 부탁드립니다.', time: '08:18', unread: true, tag: '프로젝트' },
  { sender: 'VIETQS 구조팀', subject: 'RFI response / structural quantity', preview: 'Revised quantity sheet and notes are ready for review.', time: '어제', unread: false, tag: 'VIETQS' },
  { sender: '시스템 관리자', subject: '접근등급 변경 완료 안내', preview: '요청한 프로젝트 범위 권한이 적용되었습니다.', time: '7월 20일', unread: false, tag: '시스템' },
];

export default function MailPage() {
  return (
    <div className="space-y-6">
      <section className="cc-page-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 text-[11px] font-black uppercase tracking-[.12em] text-[#4e6fd8]">Business mail</p><h1 className="text-[28px] font-black tracking-[-.04em] text-[var(--color-text-main)]">전자메일</h1><p className="mt-1 text-sm font-semibold text-[var(--color-text-sub)]">업무 메일과 프로젝트 문서를 한 흐름에서 확인합니다.</p></div>
        <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#eb6300] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(235,99,0,.22)] hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(235,99,0,.28)]"><PenLine className="h-4 w-4" /> 메일 작성</button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[[Inbox, '받은메일', '12', '읽지 않음 2건'], [Send, '보낸메일', '28', '이번 주'], [Archive, '보관함', '146', '프로젝트 연계 34건']].map(([Icon, label, value, detail]) => { const CardIcon = Icon as typeof Inbox; return <div key={label as string} className="cc-tactile-card flex items-center gap-4 p-5" data-interactive="true"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4e6fd8]"><CardIcon className="h-5 w-5" /></span><span><span className="text-xs font-black text-[var(--color-text-sub)]">{label as string}</span><strong className="mt-1 block text-2xl font-black text-[var(--color-text-main)]">{value as string}<small className="ml-1 text-[10px] text-[var(--color-text-sub)]">건</small></strong><span className="text-[10px] font-semibold text-[var(--color-text-sub)]">{detail as string}</span></span></div>; })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="cc-tactile-card p-4">
          <nav className="space-y-1">
            {[[Inbox, '받은메일', '2'], [Star, '중요메일', ''], [Send, '보낸메일', ''], [FileText, '임시보관', '1'], [Archive, '보관함', '']].map(([Icon, label, count], index) => { const NavIcon = Icon as typeof Inbox; return <button key={label as string} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-black ${index === 0 ? 'bg-[#eef2ff] text-[#3453a4]' : 'text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-2)] hover:text-[var(--color-text-main)]'}`}><NavIcon className="h-4 w-4" /><span className="flex-1">{label as string}</span>{count && <span className="rounded-full bg-[#eb6300] px-2 py-0.5 text-[9px] text-white">{count as string}</span>}</button>; })}
          </nav>
          <div className="my-4 h-px bg-[var(--color-border)]" />
          <p className="px-3 text-[9px] font-black uppercase tracking-[.14em] text-[var(--color-text-sub)]">프로젝트 메일함</p>
          <div className="mt-2 space-y-1">{['마감팀', '구조&토목&조경', '클레임', 'VIETQS'].map((name) => <button key={name} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[11px] font-bold text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-2)]"><span className="h-2 w-2 rounded-full bg-[#4e6fd8]" />{name}</button>)}</div>
        </aside>

        <div className="cc-tactile-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] p-4"><label className="flex min-h-10 flex-1 items-center rounded-xl bg-[var(--cc-surface-2)] px-3"><Search className="mr-2 h-4 w-4 text-[var(--color-text-sub)]" /><input aria-label="메일 검색" className="w-full bg-transparent text-xs font-semibold outline-none" placeholder="보낸사람, 제목, 프로젝트 검색" /></label><button className="rounded-xl border border-[var(--color-border)] p-2.5 text-[var(--color-text-sub)]"><Archive className="h-4 w-4" /></button></div>
          <div className="divide-y divide-[var(--color-border)]">{messages.map((message) => <article key={message.subject} className={`group grid gap-3 p-4 hover:bg-[#f7f9ff] dark:hover:bg-white/[.03] sm:grid-cols-[minmax(140px,.42fr)_minmax(0,1fr)_auto] sm:items-center ${message.unread ? 'bg-[#fbfcff]' : ''}`}><div className="flex min-w-0 items-center gap-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${message.unread ? 'bg-[#eb6300] shadow-[0_0_10px_rgba(235,99,0,.5)]' : 'bg-[var(--color-border)]'}`} /><strong className={`truncate text-xs ${message.unread ? 'font-black text-[var(--color-text-main)]' : 'font-semibold text-[var(--color-text-sub)]'}`}>{message.sender}</strong></div><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-md bg-[#eef2ff] px-2 py-1 text-[8px] font-black text-[#405bb0]">{message.tag}</span><strong className="truncate text-xs font-black text-[var(--color-text-main)]">{message.subject}</strong>{message.subject.includes('자료') && <Paperclip className="h-3 w-3 shrink-0 text-[var(--color-text-sub)]" />}</div><p className="mt-1 truncate text-[10px] font-semibold text-[var(--color-text-sub)]">{message.preview}</p></div><div className="flex items-center justify-between gap-3 text-[9px] font-bold text-[var(--color-text-sub)] sm:justify-end">{message.time}<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div></article>)}</div>
        </div>

        <aside className="cc-tactile-card p-5" data-interactive="true"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-black text-[var(--color-text-main)]">프로젝트 연계</h2><p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">메일에서 바로 업무로 연결</p></div><Mail className="h-5 w-5 text-[#4e6fd8]" /></div><div className="space-y-3">{[['송파 복합시설', '견적 검토 · 2건'], ['과천 지식정보타운', '일정 협의 · 4건'], ['다낭 리조트', 'VIETQS 회신 · 1건']].map(([title, meta]) => <button key={title} className="group w-full rounded-2xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-4 text-left hover:-translate-y-1 hover:bg-[var(--color-surface)] hover:shadow-lg"><strong className="block text-xs font-black text-[var(--color-text-main)]">{title}</strong><span className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[var(--color-text-sub)]">{meta}<ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1" /></span></button>)}</div></aside>
      </section>
    </div>
  );
}
