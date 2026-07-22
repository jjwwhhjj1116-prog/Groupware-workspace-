'use client';

import { BadgeDollarSign, BriefcaseBusiness, ContactRound, FileSignature, Handshake, ScanLine } from 'lucide-react';
import { ErpDashboard, type ErpModule } from '@/components/erp/ErpDashboard';
import { useContactStore } from '@/store/contactStore';

const modules: ErpModule[] = [
  { id: 'CUSTOMERS', title: '고객·주소록', description: '법인, 담당자, 연락처와 접촉 이력을 하나의 고객 원장으로 관리합니다.', href: '/sales?view=CUSTOMERS', meta: '고객 360°', icon: ContactRound },
  { id: 'PIPELINE', title: '리드·영업기회', description: '유입 경로부터 예상 수주액, 확률, 다음 행동까지 파이프라인으로 추적합니다.', href: '/sales?view=PIPELINE', meta: '단계별 전환율', icon: BriefcaseBusiness },
  { id: 'QUOTES', title: '견적·제안', description: '견적 요청과 제안 버전을 OFFDAY2 프로젝트 계보에 연결합니다.', href: '/sales?view=QUOTES', meta: '견적 버전 관리', icon: BadgeDollarSign },
  { id: 'CONTRACTS', title: '계약·수주', description: '계약금액, 범위, 납기와 수주 전환 이력을 관리합니다.', href: '/sales?view=CONTRACTS', meta: '수주 전환', icon: FileSignature },
  { id: 'BUSINESS_CARDS', title: '명함 자동등록', description: '휴대폰으로 명함을 촬영하면 OCR이 연락처를 읽고 검토 후 주소록에 등록합니다.', href: '/sales/business-cards', meta: 'OCR + 중복검사', icon: ScanLine },
  { id: 'ACTIVITIES', title: '영업활동·후속조치', description: '통화, 미팅, 메일과 후속 일정을 담당자별로 기록합니다.', href: '/sales?view=ACTIVITIES', meta: 'Next action', icon: Handshake },
];

export default function SalesPage() {
  const contactCount = useContactStore((state) => state.contacts.length);
  return <ErpDashboard eyebrow="Sales ERP workspace" title="영업" description="고객 발굴부터 견적·계약·수주까지 영업 흐름과 담당자 주소록을 연결합니다." theme="sales" stats={[{ label: '등록 고객·담당자', value: String(contactCount), detail: '명함 OCR 포함' }, { label: '진행 기회', value: '0', detail: '파이프라인 연결 대기' }, { label: '이번 달 견적', value: '0', detail: 'OFFDAY2 연계' }, { label: '수주 전환', value: '0%', detail: '운영 데이터 기준' }]} modules={modules} />;
}
