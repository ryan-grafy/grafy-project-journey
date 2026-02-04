const {
  generateFolderName,
  parseFolderName,
  formatDate,
} = require('../services/folderService');

describe('폴더명 생성', () => {
  test('기본 폴더명 생성', () => {
    const result = generateFolderName({
      name: '삼성전자 / 브랜드 개발',
      startDate: '2026-01-30',
      pm: { name: '홍길동' },
      designers: [{ name: '김철수' }],
    });

    expect(result).toBe('260130-xxxxxx_삼성전자_브랜드 개발_홍길동,김철수');
  });

  test('종료일 포함 폴더명 생성', () => {
    const result = generateFolderName({
      name: 'LG전자 / 디자인 리뉴얼',
      startDate: '2026-02-01',
      endDate: '2026-06-30',
      pm: { name: '이영희' },
    });

    expect(result).toBe('260201-260630_LG전자_디자인 리뉴얼_이영희');
  });

  test('슬래시 없는 폴더명 생성', () => {
    const result = generateFolderName({
      name: '단일 프로젝트명',
      startDate: '2026-03-15',
      pm: { name: '박지성' },
    });

    expect(result).toBe('260315-xxxxxx_미지정_단일 프로젝트명_박지성');
  });

  test('여러 디자이너 포함 폴더명 생성', () => {
    const result = generateFolderName({
      name: '현대자동차 / CI 리뉴얼',
      startDate: '2026-04-20',
      pm: { name: '최수진' },
      designers: [
        { name: '김민수' },
        { name: '이수진' },
        { name: '박도현' },
      ],
    });

    expect(result).toBe('260420-xxxxxx_현대자동차_CI 리뉴얼_최수진,김민수,이수진,박도현');
  });

  test('특수문자 처리', () => {
    const result = generateFolderName({
      name: '삼성전자 / 새 프로젝트',
      startDate: '2026-05-10',
      pm: { name: '홍길동' },
    });

    expect(result).toBe('260510-xxxxxx_삼성전자_새 프로젝트_홍길동');
  });

  test('시작일 없는 경우', () => {
    const result = generateFolderName({
      name: '프로젝트',
      pm: { name: '홍길동' },
    });

    expect(result).toBe('xxxxxx-xxxxxx_미지정_프로젝트_홍길동');
  });
});

describe('폴더명 파싱', () => {
  test('기본 폴더명 파싱', () => {
    const result = parseFolderName('260130-xxxxxx_삼성전자_브랜드 개발_홍길동,김철수');

    expect(result).toEqual({
      startDate: '260130',
      endDate: 'xxxxxx',
      client: '삼성전자',
      projectName: '브랜드 개발',
      members: '홍길동,김철수',
    });
  });

  test('종료일 포함 폴더명 파싱', () => {
    const result = parseFolderName('260201-260630_LG전자_디자인 리뉴얼_이영희');

    expect(result.endDate).toBe('260630');
    expect(result.startDate).toBe('260201');
  });

  test('프로젝트명에 스페이스가 있는 경우', () => {
    const result = parseFolderName('260130-xxxxxx_클라이언트_A 프로젝트_담당자');

    expect(result.client).toBe('클라이언트');
    expect(result.projectName).toBe('A 프로젝트');
  });

  test('잘못된 폴더명 형식', () => {
    expect(() => {
      parseFolderName('잘못된_폴더명');
    }).toThrow();
  });
});

describe('날짜 포맷팅', () => {
  test('YYYY-MM-DD 형식 변환', () => {
    const result = formatDate('2026-01-30');
    expect(result).toBe('260130');
  });

  test('종료일 없는 경우', () => {
    const result = formatDate(null);
    expect(result).toBe('xxxxxx');
  });

  test('빈 문자열 처리', () => {
    const result = formatDate('');
    expect(result).toBe('xxxxxx');
  });
});
