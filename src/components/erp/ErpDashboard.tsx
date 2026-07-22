'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, CheckCircle2, CircleDollarSign, Clock3, Layers3, Plus } from 'lucide-react';

export type ErpModule = {
  id: string;
  title: string;
  description: string;
  href: string;
  meta: string;
  icon: LucideIcon;
};

type ErpDashboardProps = {
  eyebrow: string;
  title: string;
  description: string;
  theme: 'sales' | 'finance';
  stats: Array<{ label: string; value: string; detail: string }>;
  modules: ErpModule[];
};

export function ErpDashboard({ eyebrow, title, description, theme, stats, modules }: ErpDashboardProps) {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('view');
  const selected = modules.find((module) => module.id === selectedId);
  const sales = theme === 'sales';
  const hero = sales
    ? 'from-[#123d66] via-[#176b78] to-[#22a28a]'
    : 'from-[#172554] via-[#263d73] to-[#4c5f99]';

  return (
    <div className="space-y-6">
      <section className={`overflow-hidden rounded-[28px] bg-gradient-to-br ${hero} p-6 text-white shadow-[0_24px_60px_rgba(18,61,102,.22)] sm:p-8`}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-white/65"><Layers3 className="h-4 w-4" />{eyebrow}</p>
            <h1 className="mt-3 text-[28px] font-black tracking-[-.04em] sm:text-[34px]">{title}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/72">{description}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black backdrop-blur">ERP STANDARD</span>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <article key={stat.label} className="rounded-2xl border border-white/14 bg-white/[.09] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-sm">
              <div className="flex items-center justify-between text-white/65"><span className="text-[10px] font-black">{stat.label}</span>{index % 2 ? <Clock3 className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />}</div>
              <strong className="mt-3 block text-2xl font-black tracking-[-.04em]">{stat.value}</strong>
              <span className="mt-1 block text-[10px] font-bold text-white/55">{stat.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_18px_42px_rgba(25,45,82,.08)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#4e6fd8]">Core modules</p><h2 className="mt-1 text-xl font-black text-[var(--color-text-main)]">{selected?.title || '업무 모듈'}</h2></div>
          {selected && <Link href={sales ? '/sales' : '/finance'} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-black text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]">전체 모듈 보기</Link>}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const active = module.id === selectedId;
            return (
              <Link key={module.id} href={module.href} className={`cc-tactile-card group min-h-[190px] p-5 ${active ? 'ring-2 ring-[#4e6fd8]/45' : ''}`} data-interactive="true">
                <div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${sales ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-[var(--color-text-sub)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
                <h3 className="mt-5 font-black text-[var(--color-text-main)]">{module.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-text-sub)]">{module.description}</p>
                <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--color-border)] pt-3 text-[10px] font-black text-[#4e6fd8]"><CheckCircle2 className="h-3.5 w-3.5" />{module.meta}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {selected && (
        <section className="grid gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-[1.2fr_.8fr] sm:p-6">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#4e6fd8]">Selected workspace</p><h2 className="mt-2 text-xl font-black text-[var(--color-text-main)]">{selected.title}</h2><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-sub)]">{selected.description}</p></div>
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-center"><div><Plus className="mx-auto h-6 w-6 text-[#4e6fd8]" /><p className="mt-2 text-xs font-black text-[var(--color-text-main)]">운영 데이터 연결 준비</p><p className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">권한과 회사별 원장을 연결하면 이 영역에 실데이터가 표시됩니다.</p></div></div>
        </section>
      )}
    </div>
  );
}
