# NAS 폴더 관리 백엔드 서버

NAS 서버에 프로젝트 폴더를 자동으로 생성하는 백엔드 API 서버입니다.

## 설치

```bash
cd backend
npm install
```

## 환경 설정

1. `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
copy .env.example .env
```

2. `.env` 파일에서 NAS 서버 경로를 실제 경로로 수정합니다:

```env
NAS_BASE_PATH=\\실제NAS주소\#Project# 2026 GRAFY. 프로젝트
```

## 실행

### 개발 모드 (nodemon)
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm start
```

서버는 기본적으로 `http://localhost:3001`에서 실행됩니다.

## API 엔드포인트

### 프로젝트 폴더 생성
```
POST /api/folder/create
Content-Type: application/json

{
  "name": "삼성전자 / 브랜드 개발",
  "startDate": "2026-01-30",
  "pm": { "name": "홍길동" },
  "designers": [
    { "name": "김철수" },
    { "name": "이영희" }
  ]
}
```

### 폴더 존재 확인
```
GET /api/folder/exists/:folderName
```

### 서버 상태 확인
```
GET /api/health
```

## 폴더 구조

생성되는 폴더 구조:
```
260130-xxxxxx_클라이언트_프로젝트명_담당자1,담당자2
├── ##.최종 결과물
│   ├── #발주서
│   ├── #슬루파일
│   └── #폰트
├── 00. 계약서,견적서, 마일스톤
│   ├── #견적서
│   ├── #계약서, 회사자료
│   ├── #라이선스
│   └── #물리산, 지출결의서
├── 01. 슬루 파일
├── 02. 작업물
├── 03. 수급파일
└── 04. 기타
```

## 트러블슈팅

### NAS 연결 오류
- `.env` 파일의 `NAS_BASE_PATH`가 올바른지 확인
- 네트워크 드라이브가 마운트되어 있는지 확인
- 해당 경로에 대한 읽기/쓰기 권한 확인

### 포트 충돌
`.env` 파일에서 `PORT`를 변경하세요.
