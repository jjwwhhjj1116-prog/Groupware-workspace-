'use client';

import { Banknote, Building2, Calculator, ChartNoAxesCombined, CreditCard, Landmark, ReceiptText } from 'lucide-react';
import { ErpDashboard, type ErpModule } from '@/components/erp/ErpDashboard';

const modules: ErpModule[] = [
  { id: 'SALES_PURCHASES', title: '매출·매입', description: '거래처별 매출과 매입 원장, 공급가액과 부가세를 관리합니다.', href: '/finance?view=SALES_PURCHASES', meta: '거래 원장', icon: ChartNoAxesCombined },
  { id: 'TAX_INVOICES', title: '세금계산서', description: '발행·수취·취소 상태와 증빙 연결 여부를 확인합니다.', href: '/finance?view=TAX_INVOICES', meta: '발행·수취', icon: ReceiptText },
  { id: 'CASHFLOW', title: '수금·지급', description: '청구일과 예정일, 입출금 매칭 및 미수·미지급을 추적합니다.', href: '/finance?view=CASHFLOW', meta: '미수·미지급', icon: Banknote },
  { id: 'BUDGET', title: '예산·실적', description: '회사·본부·프로젝트 예산과 실제 집행액을 비교합니다.', href: '/finance?view=BUDGET', meta: '예산 대비 실적', icon: Calculator },
  { id: 'EXPENSES', title: '경비·법인카드', description: '개인 경비와 법인카드 사용내역, 영수증과 승인 상태를 관리합니다.', href: '/finance?view=EXPENSES', meta: '증빙·전자결재', icon: CreditCard },
  { id: 'TREASURY', title: '자금현황', description: '계좌별 가용자금과 단기 자금 계획을 한눈에 확인합니다.', href: '/finance?view=TREASURY', meta: '계좌·자금계획', icon: Landmark },
  { id: 'CLOSING', title: '결산·보고서', description: '월 마감 체크리스트와 경영 보고용 손익 요약을 관리합니다.', href: '/finance?view=CLOSING', meta: '월 마감', icon: Building2 },
];

export default function FinancePage() {
  return <ErpDashboard eyebrow="Finance ERP workspace" title="재무" description="매출·매입과 증빙, 수금·지급, 예산·자금을 권한 범위에서 통합 관리합니다." theme="finance" stats={[{ label: '이번 달 매출', value: '₩0', detail: '원장 연결 대기' }, { label: '수금 예정', value: '₩0', detail: '미수금 기준' }, { label: '지급 예정', value: '₩0', detail: '미지급 기준' }, { label: '가용 자금', value: '₩0', detail: '계좌 연계 대기' }]} modules={modules} />;
}
