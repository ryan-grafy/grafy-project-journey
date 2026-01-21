
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
  { name: 'Info', title: 'Member', phone: '000-0000-0000', email: 'info@grafydesign.com' },
];

export const STEPS_STATIC: Step[] = [
  {
    id: 1,
    title: 'Check-in',
    colorClass: 'bg-blue-50',
    borderColorClass: 'border-blue-200',
    tasks: [
      { id: 't1-1', roles: [Role.CLIENT], title: '사전 질문지 작성', description: '브랜드 철학 및 니즈 파악 데이터 제출', hasFile: true },
      { id: 't1-2', roles: [Role.PM], title: '카카오 소통 채널 개설', description: '실시간 소통을 위한 팀 채팅방 세팅' },
      { id: 't1-3', roles: [Role.PM], title: '협업 툴 초기 세팅', description: '노션, 피그마, 매터 대시보드 구축' }
    ]
  },
  {
    id: 2,
    title: 'Navigation',
    colorClass: 'bg-violet-50',
    borderColorClass: 'border-violet-200',
    tasks: [
      { id: 't2-1', roles: [Role.DESIGNER], title: 'Verbal Identity', description: '키워드 분석 및 컨셉 도출' },
      { id: 't2-2', roles: [Role.PM], title: '기획 자료 아카이빙', description: '회의록 정리 및 대시보드 업데이트' },
      { id: 't2-3', roles: [Role.CLIENT], title: '전략 방향성 승인', description: '디자인 착수 전 최종 확인' }
    ]
  },
  {
    id: 3,
    title: 'Expedition 1',
    colorClass: 'bg-yellow-50',
    borderColorClass: 'border-yellow-200',
    tasks: [
      { id: 't3-base-1', roles: [Role.DESIGNER], title: '비주얼 시안 개발', description: '핵심 비주얼 가이드 제작' },
      { id: 't3-final', roles: [Role.CLIENT], title: '최종 시안 승인', description: '모든 수정 완료 및 프로젝트 픽스' }
    ]
  },
  {
    id: 4,
    title: 'Expedition 2',
    colorClass: 'bg-orange-50',
    borderColorClass: 'border-orange-200',
    tasks: []
  },
  {
    id: 5,
    title: 'Landing',
    colorClass: 'bg-green-50',
    borderColorClass: 'border-green-200',
    tasks: [
      { id: 't5-1', roles: [Role.PM], title: '최종 데이터 전달', description: '클라이언트에게 데이터 전달' },
      { id: 't5-2', roles: [Role.DESIGNER], title: '파일 아카이빙', description: '서버 폴더링 및 원본 관리' },
      { id: 't5-3', roles: [Role.PM], title: '만족도 조사 수급' },
      { id: 't5-4', roles: [Role.MANAGER], title: 'KPT 회고 진행' },
      { id: 't5-5', roles: [Role.MANAGER], title: '정산 및 클로징' }
    ]
  }
];
