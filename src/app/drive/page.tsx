import { Cloud } from 'lucide-react';
import { ModuleLanding } from '@/components/workspace/ModuleLanding';
export default function DrivePage() { return <ModuleLanding eyebrow="Shared workspace" title="드라이브" description="프로젝트 문서와 승인본을 권한 범위 안에서 공유합니다." icon={Cloud} action="파일 업로드" cards={[{title:'최근 문서',description:'내가 최근 열어본 견적서, 일정표, 검토의견을 모아봅니다.',meta:'최근 12개'},{title:'프로젝트 폴더',description:'OFFDAY2 프로젝트 번호와 데이터 계보를 기준으로 정리됩니다.',meta:'진행 18개'},{title:'승인 문서',description:'전자결재가 완료된 최종본만 별도 보관하고 이력을 남깁니다.',meta:'이번 달 24개'}]} />; }
