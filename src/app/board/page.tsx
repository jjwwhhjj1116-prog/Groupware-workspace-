import { MessageSquareText } from 'lucide-react';
import { ModuleLanding } from '@/components/workspace/ModuleLanding';
export default function BoardPage() { return <ModuleLanding eyebrow="Company board" title="게시판" description="전사 공지와 본부별 업무 소식을 빠르게 확인합니다." icon={MessageSquareText} action="게시글 작성" cards={[{title:'전사 공지',description:'보안정책, 휴무일, 시스템 업데이트 등 필수 공지를 제공합니다.',meta:'미확인 2건'},{title:'기술본부 소식',description:'마감·구조·토목·조경팀의 업무 공유와 표준 변경사항입니다.',meta:'이번 주 7건'},{title:'경영지원본부',description:'인사·총무·회계 관련 신청과 안내를 한곳에서 확인합니다.',meta:'새 글 3건'}]} />; }
