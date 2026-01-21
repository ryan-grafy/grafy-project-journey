
import { Role, Step } from './types';

export interface TeamMember {
  name: string;
  title: string;
  phone: string;
  email: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { name: '김응석', title: '대표', phone: '010-7117-5208', email: 'mondo.kim@gmail.com' },
  { name: '홍예지', title: '이사', phone: '010-5383-4147', email: 'wjatnsdl527@gmail.com' },
  { name: '한동우', title: '대리', phone: '010-5448-4325', email: 'mrdongwoochan@gmail.com' },
  { name: 'Ryan Grafy', title: 'Developer', phone: '000-0000-0000', email: 'ryan@grafydesign.com' }, // Mock Test User
];

export const ADMIN_EMAILS = [
  'mondo.kim@gmail.com',
  'wjatnsdl527@gmail.com',
  'mrdongwoochan@gmail.com',
  'ryan@grafydesign.com'
];

export const STORAGE_BUCKET = 'project-files';

export const DEFAULT_CUSTOM_TASKS: Record<number, any[]> = {
  // Step 2: 기획 및 제안
  2: [
    { id: 't2-1', title: '1차 제안', description: '', roles: [Role.PM], completed_date: '00-00-00' },
    { id: 't2-2', title: '1차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' },
    { id: 't2-3', title: '2차 제안', description: '', roles: [Role.PM], completed_date: '00-00-00' },
    { id: 't2-4', title: '2차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' }
  ],
  // Step 3: Expedition 1
  3: [
    { id: 't3-1', title: '1차 디자인 시안', description: '', roles: [Role.DESIGNER], completed_date: '00-00-00' },
    { id: 't3-2', title: '1차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' },
    { id: 't3-3', title: '2차 디자인 수정', description: '', roles: [Role.DESIGNER], completed_date: '00-00-00' },
    { id: 't3-4', title: '2차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' }
  ],
  // Step 4: Expedition 2
  4: [
    { id: 't4-1', title: '1차 개발 테스트', description: '', roles: [Role.DEVELOPER], completed_date: '00-00-00' },
    { id: 't4-2', title: '1차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' },
    { id: 't4-3', title: '2차 개발 수정', description: '', roles: [Role.DEVELOPER], completed_date: '00-00-00' },
    { id: 't4-4', title: '2차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' }
  ]
};

export const STEPS_STATIC: Step[] = [
  {
    id: 1,
    title: 'Check-in',
    colorClass: 'bg-blue-50',
    borderColorClass: 'border-blue-200',
    tasks: [
      { id: 't1-1', roles: [Role.PM, Role.DESIGNER], title: '킥오프 / 제작의 책임 정리', description: '프로젝트 시작 미팅 및 역할 정의' },
      { id: 't1-2', roles: [Role.CLIENT, Role.PM], title: 'RFP 수급', description: '제안 요청서 접수 및 검토' },
      { id: 't1-3', roles: [Role.PM], title: '사업 참고자료 정리', description: '필요 자료 수집 및 정리' },
      { id: 't1-4', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '클라이언트 워크 공유', description: '클라이언트 요구사항 및 배경 공유' },
      { id: 't1-5', roles: [Role.PM], title: '라인업 초기 세팅', description: '프로젝트 일정 및 팀 구성 세팅' }
    ]
  },
  {
    id: 2,
    title: 'Navigation',
    colorClass: 'bg-violet-50',
    borderColorClass: 'border-violet-200',
    tasks: [
      { id: 't2-round-1-pm', roles: [Role.PM], title: '제안 전략 세팅 회의', description: '1차 전략 방향 논의' },
      { id: 't2-round-1-des', roles: [Role.DESIGNER], title: '제안 전략 세팅 회의', description: '1차 디자인 방향 논의' },
      { id: 't2-round-2-pm', roles: [Role.PM], title: '제안 전략 세팅 회의', description: '2차 전략 방향 논의' },
      { id: 't2-round-2-des', roles: [Role.DESIGNER], title: '제안 전략 세팅 회의', description: '2차 디자인 방향 논의' }
    ]
  },
  {
    id: 3,
    title: 'Expedition 1',
    colorClass: 'bg-yellow-50',
    borderColorClass: 'border-yellow-200',
    tasks: [
      { id: 't3-round-1-pm', roles: [Role.PM], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 1차 시안 기획' },
      { id: 't3-round-1-des', roles: [Role.DESIGNER], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 1차 시안 디자인' },
      { id: 't3-round-2-pm', roles: [Role.PM], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 2차 시안 기획' },
      { id: 't3-round-2-des', roles: [Role.DESIGNER], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 2차 시안 디자인' },
      { id: 't3-direction', roles: [Role.CLIENT, Role.PM], title: '2차 제안 방향성 의뢰', description: '클라이언트 피드백 수렴 및 방향 조율' }
    ]
  },
  {
    id: 4,
    title: 'Expedition 2',
    colorClass: 'bg-orange-50',
    borderColorClass: 'border-orange-200',
    tasks: [
      { id: 't4-round-1-prop', roles: [Role.DESIGNER], title: '피드백 리스트 디자인 대입 제공', description: '1차 피드백 반영 시안' },
      { id: 't4-round-1-feed', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '1차 피드백 확인 및 수렴', description: '클라이언트 피드백 확인' },
      { id: 't4-round-2-prop', roles: [Role.DESIGNER], title: '피드백 리스트 디자인 대입 제공', description: '2차 피드백 반영 시안' },
      { id: 't4-round-2-feed', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '2차 피드백 확인 및 수렴', description: '클라이언트 최종 피드백 확인' }
    ]
  },
  {
    id: 5,
    title: 'Landing',
    colorClass: 'bg-green-50',
    borderColorClass: 'border-green-200',
    tasks: [
      { id: 't5-1', roles: [Role.CLIENT, Role.PM], title: '검수계약 체결', description: '최종 검수 및 계약 완료' },
      { id: 't5-2', roles: [Role.DESIGNER, Role.PM], title: '최종 제작한 솔루션을 전공 검토', description: '제작물 전문 검토' },
      { id: 't5-3', roles: [Role.DESIGNER], title: '최종 검토한 디자인', description: '디자인 최종 점검' },
      { id: 't5-4', roles: [Role.PM], title: 'RFP 검토 디자인', description: 'RFP 요구사항 충족 확인' },
      { id: 't5-5', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '최종 전달하기 전 클라이언트 디자인 검토', description: '최종 납품 전 클라이언트 확인' }
    ]
  }
];
