import { Bot } from 'lucide-react';
import { ModuleLanding } from '@/components/workspace/ModuleLanding';
export default function AiAssistantPage() { return <ModuleLanding eyebrow="AI work assistant" title="AI 챗봇" description="접근이 허용된 프로젝트와 사내 지식 범위에서 업무를 보조합니다." icon={Bot} action="새 질문" cards={[{title:'프로젝트 요약',description:'진행률, 일정 위험, 미결재 문서를 권한 범위 안에서 요약합니다.',meta:'권한 연동'},{title:'문서 초안',description:'전자결재 사유, 회의 요약, 고객 회신 초안을 빠르게 준비합니다.',meta:'초안만 생성'},{title:'업무 검색',description:'프로젝트 데이터와 승인된 사내 문서에서 근거를 찾아 답합니다.',meta:'출처 표시'}]} />; }
