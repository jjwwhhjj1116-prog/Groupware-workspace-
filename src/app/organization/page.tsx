import { Network } from 'lucide-react';
import { ModuleLanding } from '@/components/workspace/ModuleLanding';
export default function OrganizationPage() { return <ModuleLanding eyebrow="People directory" title="조직도" description="CON-COST와 VIETQS의 소속·직급·업무 역할을 확인합니다." icon={Network} action="인력 검색" cards={[{title:'경영지원본부',description:'임원, 인사·총무·회계와 그룹웨어 운영 담당자를 확인합니다.',meta:'CON-COST'},{title:'기술본부',description:'마감, 구조&토목&조경, 클레임 담당 조직과 PM 구성을 봅니다.',meta:'CON-COST'},{title:'VIETQS',description:'베트남 제작팀의 담당 공종과 협업 가능한 인력을 확인합니다.',meta:'VIETQS'}]} />; }
