'use client';

import Image from 'next/image';
import React from 'react';
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  HardHat,
  KeyRound,
  Mail,
  MessagesSquare,
  PencilRuler,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthStore } from '@/store/authStore';

type LoginLanguage = 'ko' | 'en' | 'vi';
type RecoveryMode = 'id' | 'password' | null;

const CON_COST_URL = 'http://www.con-cost.com/';
const VIET_QS_URL = 'https://theme-vietqs-170915.gitlab.io/';

const copy = {
  ko: {
    system: 'CON-COST GROUPWARE', heroTitle: '업무의 모든 흐름을 하나로 연결합니다.',
    heroBody: '전자메일, 전자결재, 프로젝트 관리, 일정, 재무관리를 한 번에. ALL IN ONE SYSTEM',
    conCostSite: 'CON-COST 홈페이지', vietQsSite: 'VIET QS 홈페이지',
    services: ['수량산출', '설계변경', '해외/FED 견적', '공사비 검토', '건설클레임'],
    secure: '보안 워크스페이스', welcome: '국내 NO.1 견적기업 CONCOST에 오신 걸 환영합니다.',
    welcomeBody: '승인된 업무 계정으로 로그인해 주세요.', email: '이메일', emailPlaceholder: '업무 이메일 입력',
    password: '비밀번호', passwordPlaceholder: '8자 이상 입력', showPassword: '비밀번호 보기', hidePassword: '비밀번호 숨기기',
    remember: '자동 로그인', findId: '아이디 찾기', findPassword: '비밀번호 찾기', login: '로그인', authenticating: '인증 확인 중...',
    accountHelp: '계정 문의', recoveryTitleId: '아이디 찾기', recoveryTitlePassword: '비밀번호 찾기',
    recoveryBody: '현재 데모 환경에서는 계정 복구가 자동 처리되지 않습니다. 경영지원 담당자에게 본인 확인 후 계정 정보를 요청해 주세요.',
    recoveryClose: '확인', invalidInput: '이메일과 8자 이상의 비밀번호를 입력해 주세요.',
    authFailed: '계정 정보가 올바르지 않거나 인증 서버에 연결할 수 없습니다.', invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    localAccounts: '로컬 UI 검수 계정', admin: '관리자', manager: '본부장', worker: '실무자',
  },
  en: {
    system: 'CON-COST GROUPWARE', heroTitle: 'Connect every workflow in one place.',
    heroBody: 'Email, approvals, projects, schedules, and finance. ALL IN ONE SYSTEM',
    conCostSite: 'CON-COST website', vietQsSite: 'VIET QS website',
    services: ['Quantity takeoff', 'Design changes', 'Overseas / FED', 'Cost review', 'Construction claims'],
    secure: 'Secure workspace', welcome: 'Welcome to CONCOST, Korea’s No.1 estimating company.',
    welcomeBody: 'Sign in with your approved business account.', email: 'Email', emailPlaceholder: 'Enter your business email',
    password: 'Password', passwordPlaceholder: 'Enter at least 8 characters', showPassword: 'Show password', hidePassword: 'Hide password',
    remember: 'Keep me signed in', findId: 'Find ID', findPassword: 'Reset password', login: 'Sign in', authenticating: 'Verifying...',
    accountHelp: 'Account help', recoveryTitleId: 'Find your ID', recoveryTitlePassword: 'Reset your password',
    recoveryBody: 'Automated account recovery is not available in this demo. Contact Management Support to verify your identity and recover access.',
    recoveryClose: 'Got it', invalidInput: 'Enter an email address and a password of at least 8 characters.',
    authFailed: 'Your credentials are invalid or the authentication server is unavailable.', invalidCredentials: 'The email address or password is incorrect.',
    localAccounts: 'Local UI test accounts', admin: 'Admin', manager: 'Manager', worker: 'Worker',
  },
  vi: {
    system: 'CON-COST GROUPWARE', heroTitle: 'Kết nối mọi quy trình công việc tại một nơi.',
    heroBody: 'Email, phê duyệt, dự án, lịch biểu và tài chính. ALL IN ONE SYSTEM',
    conCostSite: 'Trang web CON-COST', vietQsSite: 'Trang web VIET QS',
    services: ['Bóc tách khối lượng', 'Thay đổi thiết kế', 'Báo giá quốc tế / FED', 'Kiểm tra chi phí', 'Khiếu nại xây dựng'],
    secure: 'Không gian làm việc bảo mật', welcome: 'Chào mừng bạn đến với CONCOST, công ty dự toán số 1 Hàn Quốc.',
    welcomeBody: 'Đăng nhập bằng tài khoản công việc đã được phê duyệt.', email: 'Email', emailPlaceholder: 'Nhập email công việc',
    password: 'Mật khẩu', passwordPlaceholder: 'Nhập ít nhất 8 ký tự', showPassword: 'Hiện mật khẩu', hidePassword: 'Ẩn mật khẩu',
    remember: 'Tự động đăng nhập', findId: 'Tìm tài khoản', findPassword: 'Tìm mật khẩu', login: 'Đăng nhập', authenticating: 'Đang xác minh...',
    accountHelp: 'Hỗ trợ tài khoản', recoveryTitleId: 'Tìm tài khoản', recoveryTitlePassword: 'Tìm mật khẩu',
    recoveryBody: 'Bản demo chưa hỗ trợ khôi phục tự động. Vui lòng liên hệ bộ phận hỗ trợ quản lý để xác minh danh tính và lấy lại quyền truy cập.',
    recoveryClose: 'Đã hiểu', invalidInput: 'Nhập email và mật khẩu có ít nhất 8 ký tự.',
    authFailed: 'Thông tin đăng nhập không hợp lệ hoặc máy chủ xác thực không khả dụng.', invalidCredentials: 'Email hoặc mật khẩu không đúng.',
    localAccounts: 'Tài khoản kiểm thử cục bộ', admin: 'Quản trị viên', manager: 'Quản lý', worker: 'Nhân viên',
  },
} as const;

const serviceIcons = [Calculator, PencilRuler, Building2, HardHat, MessagesSquare];

export function LoginExperience() {
  const { users, loginAs, loginWithCredentials, loginError, isAuthenticating, clearLoginError, rememberLogin, setRememberLogin } = useAuthStore();
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [company, setCompany] = React.useState<'CON_COST' | 'VIET_QS'>('CON_COST');
  const [language, setLanguage] = React.useState<LoginLanguage>('ko');
  const [recoveryMode, setRecoveryMode] = React.useState<RecoveryMode>(null);
  const t = copy[language];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/workspace';
  const asset = (path: string) => `${basePath}${path}`;

  React.useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (nextLanguage: LoginLanguage) => {
    setLanguage(nextLanguage);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loginWithCredentials(identifier, password);
  };

  const errorMessage = loginError?.includes('8자') ? t.invalidInput : loginError?.includes('서버') ? t.authFailed : loginError ? t.invalidCredentials : null;
  const demoUsers = users.filter((user) => ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'WORKER'].includes(user.role)).slice(0, 3);

  return (
    <main className="cc-login-shell min-h-screen p-3 sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1480px] overflow-hidden border border-white/20 bg-[var(--color-surface)] shadow-[0_32px_88px_rgba(5,15,38,.32)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.14fr_.86fr]">
        <section className="relative min-h-[310px] overflow-hidden bg-[#081a36] text-white lg:min-h-full">
          <Image src={asset('/brand/con-cost-hero.jpg')} alt="" fill priority className="object-cover object-center" sizes="(min-width: 1024px) 58vw, 100vw" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,17,39,.88),rgba(3,17,39,.62)_62%,rgba(3,17,39,.80))]" />
          <div className="relative flex min-h-full flex-col">
            <a href={CON_COST_URL} target="_blank" rel="noreferrer" className="group flex min-h-28 w-full items-center justify-between border-b border-white/50 bg-white/95 px-7 py-5 text-[#18294c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#eb6300] sm:min-h-36 sm:px-10">
              <BrandLogo className="h-[72px] w-[310px] max-w-[72vw] sm:h-[88px] sm:w-[378px]" />
              <span className="hidden items-center gap-2 text-xs font-black uppercase sm:flex">{t.conCostSite}<ExternalLink className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
            </a>
            <div className="flex flex-1 flex-col justify-center px-7 py-8 sm:px-10 lg:px-14 lg:py-12">
              <p className="text-xs font-black tracking-[.18em] text-[#ff9d5f]">{t.system}</p>
              <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-[46px]">{t.heroTitle}</h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-200 sm:text-base">{t.heroBody}</p>
              <div className="cc-login-service-map mt-9 hidden lg:flex" aria-label={t.conCostSite}>
                {t.services.map((service, index) => {
                  const Icon = serviceIcons[index];
                  return <a key={service} href={CON_COST_URL} target="_blank" rel="noreferrer" className="cc-login-diamond focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff9d5f]"><span><Icon className="h-6 w-6" /><strong>{service}</strong></span></a>;
                })}
              </div>
              <a href={VIET_QS_URL} target="_blank" rel="noreferrer" className="group relative mt-8 flex min-h-20 items-center gap-5 overflow-hidden border border-white/25 bg-[#04152d]/85 px-5 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#60a5fa] lg:mt-12">
                <Image src={asset('/brand/vietqs-hero.png')} alt="" fill className="object-cover opacity-20" sizes="680px" />
                <span className="absolute inset-0 bg-[#04152d]/70" />
                <Image src={asset('/brand/vietqs-logo.png')} alt="VIET QS" width={300} height={75} className="relative h-10 w-auto max-w-[42%] object-contain" />
                <span className="relative h-10 w-px bg-white/20" /><span className="relative min-w-0 flex-1 text-xs font-bold text-slate-200 sm:text-sm">{t.vietQsSite}</span>
                <ExternalLink className="relative h-4 w-4 shrink-0 text-[#72c530] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-[var(--color-surface)] px-5 py-10 sm:px-10 lg:px-16">
          <div className="absolute right-5 top-5 flex border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-1" aria-label="Language">
            {(['ko', 'en', 'vi'] as const).map((code) => <button key={code} type="button" onClick={() => changeLanguage(code)} aria-pressed={language === code} className={`min-h-8 min-w-10 px-2 text-[11px] font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300] ${language === code ? 'bg-[#172554] text-white' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-surface)]'}`}>{code}</button>)}
          </div>
          <div className="w-full max-w-[470px] pt-10">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 border border-[#dce3ee] bg-[#f2f5fa] px-3 py-1.5 text-[11px] font-black text-[#40537a] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><ShieldCheck className="h-3.5 w-3.5 text-[#eb6300]" /> {t.secure}</span>
              <h2 className="mt-5 text-[28px] font-black leading-tight text-[var(--color-text-main)] sm:text-[34px]">{t.welcome}</h2>
              <p className="mt-3 text-sm font-medium text-[var(--color-text-sub)]">{t.welcomeBody}</p>
            </div>
            <div className="mb-6 grid grid-cols-2 border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-1.5">
              {([['CON_COST', 'CON-COST'], ['VIET_QS', 'VIET QS']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setCompany(id)} className={`flex min-h-11 items-center justify-center gap-2 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300] ${company === id ? 'bg-white text-[#273e7a] shadow-[0_4px_14px_rgba(39,62,122,.12)]' : 'text-[var(--color-text-sub)]'}`}><Building2 className="h-4 w-4" /> {label}</button>)}
            </div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-black text-[var(--color-text-main)]">{t.email}</span><span className="flex min-h-13 items-center border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 focus-within:border-[#4e6fd8] focus-within:ring-4 focus-within:ring-[#4e6fd8]/10"><Mail className="mr-3 h-5 w-5 text-[#6c7ea8]" /><input value={identifier} onChange={(event) => { setIdentifier(event.target.value); clearLoginError(); }} type="email" autoComplete="username" className="w-full bg-transparent py-3 text-sm font-semibold text-[var(--color-text-main)] outline-none" placeholder={t.emailPlaceholder} /></span></label>
              <label className="block"><span className="mb-2 block text-xs font-black text-[var(--color-text-main)]">{t.password}</span><span className="flex min-h-13 items-center border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-4 focus-within:border-[#4e6fd8] focus-within:ring-4 focus-within:ring-[#4e6fd8]/10"><KeyRound className="mr-3 h-5 w-5 text-[#6c7ea8]" /><input value={password} onChange={(event) => { setPassword(event.target.value); clearLoginError(); }} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="w-full bg-transparent py-3 text-sm font-semibold text-[var(--color-text-main)] outline-none" placeholder={t.passwordPlaceholder} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword} className="p-2 text-[var(--color-text-sub)] hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
                <label className="flex cursor-pointer items-center gap-2 text-[var(--color-text-main)]"><span className={`flex h-5 w-5 items-center justify-center border ${rememberLogin ? 'border-[#eb6300] bg-[#eb6300] text-white' : 'border-[var(--color-border)] bg-[var(--cc-surface-2)]'}`}>{rememberLogin && <Check className="h-3.5 w-3.5" />}</span><input type="checkbox" checked={rememberLogin} onChange={(event) => setRememberLogin(event.target.checked)} className="sr-only" />{t.remember}</label>
                <span className="flex items-center gap-3 text-[#40537a] dark:text-slate-300"><button type="button" onClick={() => setRecoveryMode('id')} className="hover:text-[#eb6300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]">{t.findId}</button><span className="h-3 w-px bg-[var(--color-border)]" /><button type="button" onClick={() => setRecoveryMode('password')} className="hover:text-[#eb6300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]">{t.findPassword}</button></span>
              </div>
              {errorMessage && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{errorMessage}</p>}
              <button disabled={isAuthenticating} className="group flex min-h-13 w-full items-center justify-center gap-2 bg-[#eb6300] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(235,99,0,.24)] hover:bg-[#cf4d00] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f7a56b] disabled:cursor-wait disabled:opacity-60">{isAuthenticating ? t.authenticating : t.login}{!isAuthenticating && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}</button>
            </form>

            {process.env.NODE_ENV !== 'production' && demoUsers.length > 0 && <div className="mt-6 border border-dashed border-[#bac6dc] bg-[#f7f9fc] p-4 dark:border-white/10 dark:bg-white/[.03]"><p className="mb-3 text-[11px] font-black uppercase tracking-[.12em] text-[#6c7ea8]">{t.localAccounts}</p><div className="flex flex-wrap gap-2">{demoUsers.map((user) => <button key={user.id} type="button" onClick={() => loginAs(user.id)} className="border border-[#dce3ee] bg-white px-3 py-2 text-xs font-bold text-[#273e7a] shadow-sm hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]">{user.displayName ?? user.name} · {user.role === 'SUPER_ADMIN' ? t.admin : user.role === 'DEPARTMENT_MANAGER' ? t.manager : t.worker}</button>)}</div></div>}
            <div className="mt-7 flex items-center justify-between border-t border-[var(--color-border)] pt-5 text-[11px] font-semibold text-[var(--color-text-sub)]"><span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> KO · EN · VI</span><button type="button" onClick={() => setRecoveryMode('id')} className="hover:text-[#eb6300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]">{t.accountHelp}</button></div>
          </div>
        </section>
      </div>

      {recoveryMode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07152f]/70 p-4" role="presentation" onMouseDown={() => setRecoveryMode(null)}><section role="dialog" aria-modal="true" aria-labelledby="recovery-title" className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><span className="flex h-10 w-10 items-center justify-center bg-[#fff0e6] text-[#eb6300]"><ShieldCheck className="h-5 w-5" /></span><h3 id="recovery-title" className="mt-4 text-xl font-black text-[var(--color-text-main)]">{recoveryMode === 'id' ? t.recoveryTitleId : t.recoveryTitlePassword}</h3></div><button type="button" onClick={() => setRecoveryMode(null)} aria-label={t.recoveryClose} className="p-2 text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm leading-6 text-[var(--color-text-sub)]">{t.recoveryBody}</p><div className="mt-6 flex items-center justify-between gap-3"><a href={CON_COST_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-[#40537a] hover:text-[#eb6300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6300]">{t.conCostSite}<ExternalLink className="h-3.5 w-3.5" /></a><button type="button" onClick={() => setRecoveryMode(null)} className="bg-[#172554] px-5 py-2.5 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4e6fd8]/40">{t.recoveryClose}</button></div></section></div>}
    </main>
  );
}
