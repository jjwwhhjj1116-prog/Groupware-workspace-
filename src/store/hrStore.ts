import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  isImportant: boolean;
}

export interface HrState {
  notices: Notice[];
  loadDummyHrData: () => void;
}

const mockNotices: Notice[] = [
  {
    id: 'n1',
    title: '전사 하계 휴가 일정 안내',
    content: '올해 전사 하계 휴가는 8월 첫째 주로 예정되어 있습니다.',
    date: new Date().toISOString(),
    author: '경영지원팀',
    isImportant: true,
  },
  {
    id: 'n2',
    title: '신규 입사자 교육 안내',
    content: '다음 주 월요일 신규 입사자 OJT가 진행됩니다.',
    date: new Date().toISOString(),
    author: '경영지원팀',
    isImportant: false,
  }
];

export const useHrStore = create<HrState>()(persist((set) => ({
  notices: mockNotices,
  
  loadDummyHrData: () => set({ notices: mockNotices }),
}), { name: 'hr-storage' }));
