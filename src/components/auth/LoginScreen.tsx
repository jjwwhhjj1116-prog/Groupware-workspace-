'use client';

import React from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Globe2, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthStore } from '@/store/authStore';

export function LoginScreen() {
  const { users, loginAs, loginWithCredentials, loginError, isAuthenticating, clearLoginError } = useAuthStore();
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [company, setCompany] = React.useState<'CON_COST' | 'VIET_QS'>('CON_COST');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loginWithCredentials(identifier, password);
  };

  const demoUsers = users.filter((user) => ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'WORKER'].includes(user.role)).slice(0, 3);

  return (
    <main className="cc-login-shell min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1380px] overflow-hidden rounded-[28px] border border-white/10 bg-[var(--color-surface)] shadow-[0_34px_90px_rgba(8,18,46,.32)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#172554] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-[#4e6fd8]/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-[#eb6300]/20 blur-3xl" />
          <div className="relative z-10 flex h-12 w-[176px] items-center rounded-2xl bg-white px-4 shadow-lg">
            <BrandLogo />
          </div>

          <div className="relative z-10 max-w-xl">
            <p className="mb-5 text-xs font-black uppercase tracking-[.24em] text-[#9db3ff]">Unified workspace</p>
            <h1 className="text-[42px] font-black leading-[1.16] tracking-[-.04em]">
              프로젝트와 사람을<br />하나의 흐름으로 연결합니다.
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-7 text-slate-300">
              전자결재, OFFDAY2 프로젝트 관리, 일정과 할일을 권한에 맞게 안전하게 제공합니다.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                ['92', '통합 인력'],
                ['2', '법인 연계'],
                ['등급별', '접근 제어'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[20px] border border-white/10 bg-white/[.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.14)] backdrop-blur">
                  <strong className="block text-xl font-black text-white">{value}</strong>
                  <span className="mt-1 block text-xs font-semibold text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <ShieldCheck className="h-4 w-4 text-[#ff8a3d]" />
            승인된 계정과 접근등급에 따라 메뉴와 데이터가 자동 제한됩니다.
          </div>
        </section>

        <section className="flex items-center justify-center bg-[var(--color-surface)] px-5 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[460px]">
            <div className="mb-9 lg:hidden">
              <div className="mb-8 h-10 w-[150px]"><BrandLogo /></div>
            </div>
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#dce3ee] bg-[#f2f5fa] px-3 py-1.5 text-[11px] font-black text-[#40537a] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-[#eb6300]" /> 보안 워크스페이스
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-.04em] text-[var(--color-text-main)]">다시 만나서 반갑습니다.</h2>
              <p className="mt-2 text-sm font-medium text-[var(--color-text-sub)]">소속과 업무 계정으로 로그인해 주세요.</p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-1.5">
              {([
                ['CON_COST', 'CON-COST'],
                ['VIET_QS', 'VIETQS'],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setCompany(id)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${company === id ? 'bg-[var(--color-surface)] text-[#273e7a] shadow-[0_6px_18px_rgba(39,62,122,.12)] dark:text-white' : 'text-[var(--color-text-sub)]'}`}>
                  <Building2 className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-[var(--color-text-main)]">사번 또는 업무 이메일</span>
                <span className="flex min-h-13 items-center rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 focus-within:border-[#4e6fd8] focus-within:ring-4 focus-within:ring-[#4e6fd8]/10">
                  <UserRound className="mr-3 h-5 w-5 text-[#6c7ea8]" />
                  <input value={identifier} onChange={(event) => { setIdentifier(event.target.value); clearLoginError(); }} autoComplete="username" className="w-full bg-transparent py-3 text-sm font-semibold text-[var(--color-text-main)] outline-none" placeholder={company === 'CON_COST' ? '사번 또는 @concost 계정' : 'Employee ID or VIETQS email'} />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-[var(--color-text-main)]">비밀번호</span>
                <span className="flex min-h-13 items-center rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 focus-within:border-[#4e6fd8] focus-within:ring-4 focus-within:ring-[#4e6fd8]/10">
                  <KeyRound className="mr-3 h-5 w-5 text-[#6c7ea8]" />
                  <input value={password} onChange={(event) => { setPassword(event.target.value); clearLoginError(); }} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="w-full bg-transparent py-3 text-sm font-semibold text-[var(--color-text-main)] outline-none" placeholder="8자 이상 입력" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} className="rounded-lg p-1.5 text-[var(--color-text-sub)] hover:bg-[var(--color-surface)]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {loginError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{loginError}</p>}

              <button disabled={isAuthenticating} className="group flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#eb6300] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(235,99,0,.24),inset_0_1px_0_rgba(255,255,255,.25)] hover:-translate-y-0.5 hover:bg-[#cf4d00] disabled:cursor-wait disabled:opacity-60">
                {isAuthenticating ? '인증 확인 중…' : '워크스페이스 로그인'}
                {!isAuthenticating && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            {process.env.NODE_ENV !== 'production' && demoUsers.length > 0 && (
              <div className="mt-7 rounded-2xl border border-dashed border-[#bac6dc] bg-[#f7f9fc] p-4 dark:border-white/10 dark:bg-white/[.03]">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[.12em] text-[#6c7ea8]">로컬 UI 검수 계정</p>
                <div className="flex flex-wrap gap-2">
                  {demoUsers.map((user) => (
                    <button key={user.id} type="button" onClick={() => loginAs(user.id)} className="rounded-lg border border-[#dce3ee] bg-white px-3 py-2 text-xs font-bold text-[#273e7a] shadow-sm hover:-translate-y-0.5 hover:shadow-md">
                      {user.name} · {user.role === 'SUPER_ADMIN' ? '관리자' : user.role === 'DEPARTMENT_MANAGER' ? '본부장' : '실무자'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-[var(--color-border)] pt-5 text-[11px] font-semibold text-[var(--color-text-sub)]">
              <span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> 한국어 · Tiếng Việt</span>
              <span>계정 문의 · 경영지원본부</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
