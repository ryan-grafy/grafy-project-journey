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
    { id: 'id-a1b2', title: '1차 제안', description: '', roles: [Role.PM], completed_date: '00-00-00' },
    { id: 'id-c3d4', title: '1차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' },
    { id: 'id-e5f6', title: '2차 제안', description: '', roles: [Role.PM], completed_date: '00-00-00' },
    { id: 'id-g7h8', title: '2차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' }
  ],
  // Step 3: Expedition 1
  3: [
    { id: 'id-i9j0', title: '1차 디자인 시안', description: '', roles: [Role.DESIGNER], completed_date: '00-00-00' },
    { id: 'id-k1l2', title: '1차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' },
    { id: 'id-m3n4', title: '2차 디자인 수정', description: '', roles: [Role.DESIGNER], completed_date: '00-00-00' },
    { id: 'id-o5p6', title: '2차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' }
  ],
  // Step 4: Expedition 2
  4: [
    { id: 'id-q7r8', title: '1차 개발 테스트', description: '', roles: [Role.DEVELOPER], completed_date: '00-00-00' },
    { id: 'id-s9t0', title: '1차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' },
    { id: 'id-u1v2', title: '2차 개발 수정', description: '', roles: [Role.DEVELOPER], completed_date: '00-00-00' },
    { id: 'id-w3x4', title: '2차 피드백 수급', description: '', roles: [Role.CLIENT], completed_date: '00-00-00' }
  ]
};

export const STEPS_STATIC: Step[] = [
  {
    id: 1,
    title: 'Check-in',
    colorClass: 'bg-blue-50',
    borderColorClass: 'border-blue-200',
    tasks: [
      { id: 'id-t1z1', roles: [Role.PM, Role.DESIGNER], title: '킥오프 / 제작의 책임 정리', description: '프로젝트 시작 미팅 및 역할 정의' },
      { id: 'id-t1z2', roles: [Role.CLIENT, Role.PM], title: 'RFP 수급', description: '제안 요청서 접수 및 검토' },
      { id: 'id-t1z3', roles: [Role.PM], title: '사업 참고자료 정리', description: '필요 자료 수집 및 정리' },
      { id: 'id-t1z4', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '클라이언트 워크 공유', description: '클라이언트 요구사항 및 배경 공유' },
      { id: 'id-t1z5', roles: [Role.PM], title: '라인업 초기 세팅', description: '프로젝트 일정 및 팀 구성 세팅' }
    ]
  },
  {
    id: 2,
    title: 'Navigation',
    colorClass: 'bg-violet-50',
    borderColorClass: 'border-violet-200',
    tasks: [
      { id: 'id-t2r1', roles: [Role.PM], title: '제안 전략 세팅 회의', description: '1차 전략 방향 논의' },
      { id: 'id-t2r2', roles: [Role.DESIGNER], title: '제안 전략 세팅 회의', description: '1차 디자인 방향 논의' },
      { id: 'id-t2r3', roles: [Role.PM], title: '제안 전략 세팅 회의', description: '2차 전략 방향 논의' },
      { id: 'id-t2r4', roles: [Role.DESIGNER], title: '제안 전략 세팅 회의', description: '2차 디자인 방향 논의' }
    ]
  },
  {
    id: 3,
    title: 'Expedition 1',
    colorClass: 'bg-yellow-50',
    borderColorClass: 'border-yellow-200',
    tasks: [
      { id: 'id-t3r1', roles: [Role.PM], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 1차 시안 기획' },
      { id: 'id-t3r2', roles: [Role.DESIGNER], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 1차 시안 디자인' },
      { id: 'id-t3r3', roles: [Role.PM], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 2차 시안 기획' },
      { id: 'id-t3r4', roles: [Role.DESIGNER], title: 'Brand Identity, Font, Color 제안', description: '브랜드 아이덴티티 2차 시안 디자인' },
      { id: 'id-t3d1', roles: [Role.CLIENT, Role.PM], title: '2차 제안 방향성 의뢰', description: '클라이언트 피드백 수렴 및 방향 조율' }
    ]
  },
  {
    id: 4,
    title: 'Expedition 2',
    colorClass: 'bg-orange-50',
    borderColorClass: 'border-orange-200',
    tasks: [
      { id: 'id-t4r1', roles: [Role.DESIGNER], title: '피드백 리스트 디자인 대입 제공', description: '1차 피드백 반영 시안' },
      { id: 'id-t4r2', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '1차 피드백 확인 및 수렴', description: '클라이언트 피드백 확인' },
      { id: 'id-t4r3', roles: [Role.DESIGNER], title: '피드백 리스트 디자인 대입 제공', description: '2차 피드백 반영 시안' },
      { id: 'id-t4r4', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '2차 피드백 확인 및 수렴', description: '클라이언트 최종 피드백 확인' }
    ]
  },
  {
    id: 5,
    title: 'Landing',
    colorClass: 'bg-green-50',
    borderColorClass: 'border-green-200',
    tasks: [
      { id: 'id-t5z1', roles: [Role.CLIENT, Role.PM], title: '검수계약 체결', description: '최종 검수 및 계약 완료' },
      { id: 'id-t5z2', roles: [Role.DESIGNER, Role.PM], title: '최종 제작한 솔루션을 전공 검토', description: '제작물 전문 검토' },
      { id: 'id-t5z3', roles: [Role.DESIGNER], title: '최종 검토한 디자인', description: '디자인 최종 점검' },
      { id: 'id-t5z4', roles: [Role.PM], title: 'RFP 검토 디자인', description: 'RFP 요구사항 충족 확인' },
      { id: 'id-t5z5', roles: [Role.CLIENT, Role.PM, Role.DESIGNER], title: '최종 전달하기 전 클라이언트 디자인 검토', description: '최종 납품 전 클라이언트 확인' }
    ]
  }
];
