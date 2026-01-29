# React 프로젝트 최적화 계획

## TL;DR

> **Quick Summary**: 3102줄 App.tsx를 Zustand 상태 관리, 컴포넌트 분리, 타입 안정성, 성능 최적화를 통해 리팩토링합니다. 모든 기능 유지, Vitest 테스트 인프라 구축.
>
> **Deliverables**:
> - Zustand 스토어 4개 (auth, projects, tasks, ui)
> - 8개 분리된 컴포넌트
> - 4개 커스텀 훅
> - 통합된 로직 유틸리티 함수
> - 매직 넘버 상수화
> - Vitest 테스트 인프라
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: 테스트 설정 → Zustand 스토어 → 컴포넌트 분리 → 기능 이동 → 최적화

---

## Context

### Original Request
React 19 + TypeScript + Vite 프로젝트 최적화:
- App.tsx가 2800줄이 넘음 (실제 3102줄)
- useState가 30개 이상
- 코드 중복 심각 (localStorage 10회+, Supabase 업데이트 중복)
- 하드코딩된 매직 넘버 (setTimeout 3000ms, 5000ms)
- 복잡한 함수 (getVisibleTasks 150줄+, handleImportFromExcel 370줄+)
- any 타입 남용, 타입 단언 남용
- checkEmailAuthorization 항상 true 반환
- React.memo 누락, Map/Set 매 렌더링 시 재생성
- 로컬에서만 작업, GitHub에 푸시하지 않음

### Interview Summary
**Key Discussions**:
- 테스트 인프라: 사용자가 자동 결정 요청 → Vitest + React Testing Library 선택
- 상태 관리: Zustand 라이브러리 도입
- checkEmailAuthorization: FIXME 제거, 로그인만 확인으로 단순화
- 작업 방식: 한 번에 전체 최적화 (대규모 리팩토링)

**Research Findings**:
- React 19 컴파일러가 대부분의 memoization 자동 처리
- 복잡한 컴포넌트는 기능 기반으로 200-300줄 단위로 분리 권장
- Zustand는 Context보다 간결하고 성능 우수
- Map/Set 재생성은 useMemo로 안정화 필요

---

## Work Objectives

### Core Objective
3102줄 App.tsx를 유지보수 가능한 구조로 리팩토링하며 모든 기능을 보존합니다.

### Concrete Deliverables
- Zustand 스토어 4개 (`store/auth.ts`, `store/projects.ts`, `store/tasks.ts`, `store/ui.ts`)
- 분리된 컴포넌트 8개 (`components/AuthFlow.tsx`, `components/ProjectDashboard.tsx`, `components/TaskManager.tsx`, `components/RoundsControl.tsx`, `components/ExcelImportExport.tsx`, `components/ModalManager.tsx`, `components/Toaster.tsx`, `utils/storage.ts`, `utils/taskHelpers.ts`)
- Vitest 테스트 설정 (`vitest.config.ts`, `__tests__/setup.ts`)
- 상수 파일 확장 (`constants/ui.ts`, `constants/timeouts.ts`)

### Definition of Done
- [ ] App.tsx가 500줄 이하로 축소 (코디네이터 역할만)
- [ ] 모든 useState가 Zustand 스토어로 이동
- [ ] `any` 타입 0개, `as any` 0개
- [ ] 매직 넘버 모두 상수화
- [ ] Map/Set 재생성 문제 해결
- [ ] localStorage.setItem 중복 제거
- [ ] 테스트 인프라 설정 완료
- [ ] 모든 기능이 기존과 동일하게 작동
- [ ] 로컬에서만 작업, GitHub에 푸시하지 않음

### Must Have
- Zustand 상태 관리 라이브러리 도입
- Vitest + @testing-library/react 테스트 설정
- 모든 기능 보존 (100% 역호환)
- TypeScript strict 모드 유지

### Must NOT Have (Guardrails)
- 기능 변경 금지
- GitHub push 금지
- 외부 API 스키마 변경
- 데이터베이스 마이그레이션

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Vitest 테스트 인프라 설정
└── Task 2: 매직 넘버 상수화

Wave 2 (After Wave 1):
├── Task 3: 유틸리티 함수 추출 (storage, taskHelpers)
└── Task 4: Zustand 스토어 구조 설계 및 생성

Wave 3 (After Wave 2):
├── Task 5: auth 스토어 생성
├── Task 6: projects 스토어 생성
├── Task 7: tasks 스토어 생성
└── Task 8: ui 스토어 생성

Wave 4 (After Wave 3):
├── Task 9: AuthFlow 컴포넌트 분리
├── Task 10: ModalManager 컴포넌트 분리
└── Task 11: Toaster 컴포넌트 분리

Wave 5 (After Wave 4):
├── Task 12: ProjectDashboard 컴포넌트 분리
├── Task 13: TaskManager 컴포넌트 분리
└── Task 14: App.tsx 리팩토링 (상태 교체 + 컴포넌트 통합)

Critical Path: Wave 1 → Wave 4 → Wave 5
Parallel Speedup: ~45% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4 | 2 |
| 2 | None | 4, 9-14 | 1 |
| 3 | 1 | 5-8 | 4 |
| 4 | 1, 2 | 5-8 | 3 |
| 5 | 3, 4 | 9 | 6, 7, 8 |
| 6 | 3, 4 | 9 | 5, 7, 8 |
| 7 | 3, 4 | 12 | 5, 6, 8 |
| 8 | 3, 4 | 10, 11 | 5, 6, 7 |
| 9 | 5 | 14 | 10, 11 |
| 10 | 8 | 14 | 9, 11 |
| 11 | 8 | 14 | 9, 10 |
| 12 | 7 | 14 | 13 |
| 13 | 7 | 14 | 12 |
| 14 | 9-13 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | Task 1: quick, Task 2: quick |
| 2 | 3, 4 | Task 3: quick, Task 4: ultrabrain (architecture design) |
| 3 | 5-8 | parallel background with load_skills=['vercel-react-best-practices'] |
| 4 | 9-11 | parallel background with load_skills=['frontend-ui-ux'] |
| 5 | 12-14 | Task 12-13: parallel, Task 14: visual-engineering (orchestrator) |

---

## TODOs

---

### Wave 1: 기반 설정

- [ ] 1. Vitest 테스트 인프라 설정

  **What to do**:
  - 패키지 설치: `bun add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
  - vitest.config.ts 생성 (Vite 호환 설정)
  - __tests__/setup.ts 생성 (testing-library 설정)
  - package.json에 테스트 스크립트 추가: `"test": "vitest", "test:ui": "vitest --ui"`
  - 기본 테스트 작성 (테스트 인프라 검증): `__tests__/example.test.tsx`

  **Must NOT do**:
  - GitHub에 푸시하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 간단한 설치 및 설정 작업
  - **Skills**: None required
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - Vite 공식 Vitest 설정 가이드: https://vitest.dev/guide/#using-vite

  **API/Type References**:
  - vitest.config.ts: https://vitest.dev/config/

  **Test References**:

  **Documentation References**:
  - Testing Library 공식 문서: https://testing-library.com/docs/react-testing-library/intro

  **External References**:
  - Vitest + Vite 설정 예시: https://github.com/vitest-dev/vitest/tree/main/examples/react-testing-lib

  **Acceptance Criteria**:
  - [ ] package.json에 vitest, @testing-library/* 의존성 추가됨
  - [ ] vitest.config.ts 파일 생성됨
  - [ ] __tests__/setup.ts 파일 생성됨
  - [ ] package.json scripts에 "test": "vitest" 추가됨
  - [ ] `bun test` 실행 시 1개 예제 테스트 통과

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  # Assert: Output contains "1 passed"
  ```

  **Evidence to Capture**:
  - [ ] 터미널 출력 (bun test 실행 결과)
  - [ ] 생성된 vitest.config.ts 파일 내용

  **Commit**: YES
  - Message: `chore: add Vitest test infrastructure`
  - Files: package.json, vitest.config.ts, __tests__/setup.ts, __tests__/example.test.tsx
  - Pre-commit: `bun test`

---

- [ ] 2. 매직 넘버 상수화

  **What to do**:
  - `constants/timeouts.ts` 생성: TOAST_DURATION_MS (3000), INIT_TIMEOUT_MS (5000), AUTH_GRACE_PERIOD_MS (3000)
  - `constants/ui.ts` 생성: MIN_ROUNDS_COUNT (2), MAX_ROUND_ITERATIONS (10)
  - constants.ts에 새 상수들 export
  - App.tsx의 모든 매직 넘버를 상수로 교체:
    - `setTimeout(() => ..., 3000)` → `setTimeout(() => ..., TOAST_DURATION_MS)`
    - `setTimeout(() => ..., 5000)` → `setTimeout(() => ..., INIT_TIMEOUT_MS)`
    - `for (let r = 1; r <= 10; r++)` → `for (let r = 1; r <= MAX_ROUND_ITERATIONS; r++)`

  **Must NOT do**:
  - 기능 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순한 상수 추출 및 교체 작업
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 4, 9-14
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - App.tsx:119 (INIT_TIMEOUT_MS)
  - App.tsx:241 (AUTH_GRACE_PERIOD_MS)
  - App.tsx:410, 458 (TOAST_DURATION_MS)
  - App.tsx:2566 (MAX_ROUND_ITERATIONS)

  **API/Type References**:
  - constants.ts:11-23 (TEAM_MEMBERS, ADMIN_EMAILS 패턴 참조)

  **Test References**:

  **Documentation References**:
  - 네이밍 컨벤션 가이드: UPPER_SNAKE_CASE 사용

  **External References**:
  - JS 상수 관리 베스트 프랙티스: https://www.syncfusion.com/blogs/post/top-10-javascript-naming-convention

  **Acceptance Criteria**:
  - [ ] constants/timeouts.ts 생성됨: TOAST_DURATION_MS, INIT_TIMEOUT_MS, AUTH_GRACE_PERIOD_MS
  - [ ] constants/ui.ts 생성됨: MIN_ROUNDS_COUNT, MAX_ROUND_ITERATIONS
  - [ ] App.tsx에서 setTimeout(3000) 모두 TOAST_DURATION_MS로 교체됨
  - [ ] App.tsx에서 setTimeout(5000) INIT_TIMEOUT_MS로 교체됨
  - [ ] App.tsx에서 for (let r = 1; r <= 10; r++) MAX_ROUND_ITERATIONS로 교체됨
  - [ ] 하드코딩된 숫자 리터럴 없음 (단일 책임 원칙 준수)

  **Automated Verification**:
  ```bash
  # Agent runs:
  grep -n "3000\|5000" App.tsx | grep -v "TIMEOUT"
  # Assert: Output is empty (no hardcoded timeouts)
  ```

  **Evidence to Capture**:
  - [ ] 생성된 constants/timeouts.ts, constants/ui.ts 파일 내용
  - [ ] grep 명령어 출력 (하드코딩 확인)

  **Commit**: YES
  - Message: `refactor: extract magic numbers to constants`
  - Files: constants/timeouts.ts, constants/ui.ts, constants.ts, App.tsx
  - Pre-commit: `bun test`

---

### Wave 2: 유틸리티 및 스토어 설계

- [ ] 3. 유틸리티 함수 추출

  **What to do**:
  - `utils/storage.ts` 생성:
    - `saveLocalStorage(key: string, value: unknown)` 함수
    - `loadLocalStorage(key: string, fallback?: T)` 제네릭 함수
    - `saveProjects(projects: Project[])`: localStorage.setItem("grafy_projects", JSON.stringify(...)) 중복 제거
    - `saveTeamMembers(members: TeamMember[])`: localStorage.setItem("grafy_team", ...) 중복 제거
  - `utils/taskHelpers.ts` 생성:
    - `getVisibleTasks(stepId: number, project: Project, roundCount: number): Task[]` 함수 이동
    - `calculateTotalTasks(project: Project): number` 함수 이동
    - `findTaskInProject(project: Project | null, taskId: string): Task | null` 함수 이동
  - App.tsx에서 해당 함수들 삭제하고 import로 교체

  **Must NOT do**:
  - 함수 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 순수 함수 이동 작업
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5-8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - App.tsx:844-856 (syncTasks 함수 → utils/storage.ts)
  - App.tsx:895-1043 (getVisibleTasks → utils/taskHelpers.ts)
  - App.tsx:1148-1160 (findTaskInProject → utils/taskHelpers.ts)
  - App.tsx:1262-1298 (calculateTotalTasks → utils/taskHelpers.ts)
  - App.tsx:723-726 (saveTeamMembers → utils/storage.ts)
  - App.tsx:794, 887, 1417, 1426, 1457, 1496, 1572, 1726, 1826, 1971, 2020, 2600, 2817, 2974 (localStorage.setItem 호출들)

  **API/Type References**:
  - types.ts:37-48 (Task 인터페이스)
  - types.ts:84-119 (Project 인터페이스)

  **Test References**:
  - __tests__/utils/storage.test.ts 참조 (이후 작업)

  **Documentation References**:
  - 유틸리티 함수 추출 가이드: https://kentcdodds.com/blog/application-state-management-with-react-hooks

  **External References**:
  - React 유틸리티 패턴: https://www.patterns.dev/posts/presentational-component-pattern/

  **Acceptance Criteria**:
  - [ ] utils/storage.ts 생성됨: saveLocalStorage, loadLocalStorage, saveProjects, saveTeamMembers
  - [ ] utils/taskHelpers.ts 생성됨: getVisibleTasks, calculateTotalTasks, findTaskInProject
  - [ ] App.tsx에서 해당 함수들 삭제됨
  - [ ] App.tsx 상단에 import 구문 추가됨
  - [ ] 함수 로직이 변경되지 않음 (동일 동작 보장)

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] 생성된 utils/storage.ts, utils/taskHelpers.ts 파일 내용
  - [ ] App.tsx import 구문

  **Commit**: YES
  - Message: `refactor: extract utility functions to dedicated modules`
  - Files: utils/storage.ts, utils/taskHelpers.ts, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 4. Zustand 스토어 구조 설계 및 생성

  **What to do**:
  - `store/` 디렉토리 생성
  - Zustand 패키지 설치: `bun add zustand`
  - 스토어 구조 설계:
    - `store/auth.ts`: user, currentView, isInitializing, isAuthLoading
    - `store/projects.ts`: projects, deletedProjects, templates, currentProject, teamMembers
    - `store/tasks.ts`: completedTasks, taskLinks
    - `store/ui.ts`: rounds, rounds2, roundsNavigation, toastMsg, activeRole, isSnapshotMode, snapshotSelectedTasks, confirmHideExpedition2, popover, taskEditPopover, 모달 상태들
  - 각 스토어에 actions 정의 (setter 함수들)
  - TypeScript 타입 안정성 확보 (strict typing)

  **Must NOT do**:
  - 상태 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 스토어 구조 설계는 아키텍처적 결정이 필요
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: 상태 관리 및 성능 최적화 패턴 가이드

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5-8
  - **Blocked By**: Task 1, 2

  **References**:

  **Pattern References**:
  - App.tsx:38-73 (auth 관련 useState: user, currentView, isInitializing, isAuthLoading)
  - App.tsx:49-56 (projects 관련 useState: projects, deletedProjects, templates, currentProject, teamMembers)
  - App.tsx:63-70 (tasks 관련 useState: completedTasks, taskLinks)
  - App.tsx:67-99 (ui 관련 useState: rounds, rounds2, roundsNavigation, toastMsg, activeRole, isSnapshotMode, snapshotSelectedTasks, confirmHideExpedition2, popover, taskEditPopover, 모달 상태들)

  **API/Type References**:
  - Zustand 공식 문서: https://zustand-demo.pmnd.rs/
  - Zustand TypeScript 가이드: https://docs.pmnd.rs/zustand/guides/typescript

  **Test References**:

  **Documentation References**:
  - 상태 관리 결정 트리: React 공식 문서 "Scaling Up with Reducer and Context"

  **External References**:
  - Zustand 실사용 예시: https://github.com/pmndrs/zustand/tree/main/examples
  - Zustand + React 19 패턴: https://www.builder.io/blog/zustand-state-management-react

  **Acceptance Criteria**:
  - [ ] store/ 디렉토리 생성됨
  - [ ] store/auth.ts 생성됨: user, currentView, isInitializing, isAuthLoading 상태 + actions
  - [ ] store/projects.ts 생성됨: projects, deletedProjects, templates, currentProject, teamMembers 상태 + actions
  - [ ] store/tasks.ts 생성됨: completedTasks, taskLinks 상태 + actions
  - [ ] store/ui.ts 생성됨: rounds, rounds2, roundsNavigation, toastMsg, activeRole, isSnapshotMode, snapshotSelectedTasks, confirmHideExpedition2, popover, taskEditPopover, 모달 상태 + actions
  - [ ] 모든 스토어가 TypeScript strict typing 준수
  - [ ] 각 스토어에서 관련 setter 함수들이 정의됨

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] 생성된 store/*.ts 파일들 내용
  - [ ] TypeScript 컴파일 통과 확인

  **Commit**: YES
  - Message: `feat: add Zustand store architecture`
  - Files: store/auth.ts, store/projects.ts, store/tasks.ts, store/ui.ts, package.json
  - Pre-commit: `bun test`

---

### Wave 3: 스토어 구현

- [ ] 5. auth 스토어 생성

  **What to do**:
  - `store/auth.ts` 구현:
    - `useAuthStore` 훅 생성
    - 상태: user: User, currentView: ViewType, isInitializing: boolean, isAuthLoading: boolean
    - actions: setUser(), setCurrentView(), setIsInitializing(), setIsAuthLoading()
    - `checkEmailAuthorization` 함수 포함 (항상 true 반환, FIXME 제거)
    - `handleGoogleLogin`, `handleLogout` 함수들 포함
  - App.tsx에서 해당 useState들을 useAuthStore 훅으로 교체

  **Must NOT do**:
  - 인증 로직 변경 금지 (단순 이동)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 비즈니스 로직 이동 작업
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6-8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 3, 4

  **References**:

  **Pattern References**:
  - App.tsx:323-364 (checkEmailAuthorization 함수)
  - App.tsx:366-425 (handleGoogleLogin, handleLogout 함수)
  - App.tsx:38-44 (useState 선언들)

  **API/Type References**:
  - types.ts:11-18 (User 인터페이스)
  - supabaseClient.ts:34-59 (signInWithGoogle, signOut 함수)

  **Test References**:
  - __tests__/store/auth.test.ts 참조 (이후 작업)

  **Documentation References**:
  - Zustand 공식 문서: https://docs.pmnd.rs/zustand/guides/typescript

  **External References**:
  - Zustand slice 패턴: https://dev.to/mbarzeev/create-slice-in-zustand-4532

  **Acceptance Criteria**:
  - [ ] useAuthStore 훅 정의됨
  - [ ] checkEmailAuthorization 함수가 항상 true 반환 (FIXME 제거)
  - [ ] App.tsx에서 해당 useState들이 useAuthStore()로 교체됨
  - [ ] 인증 로직이 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] store/auth.ts 파일 내용
  - [ ] App.tsx useAuthStore 사용 코드

  **Commit**: YES
  - Message: `refactor: implement auth store with Zustand`
  - Files: store/auth.ts, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 6. projects 스토어 생성

  **What to do**:
  - `store/projects.ts` 구현:
    - `useProjectsStore` 훅 생성
    - 상태: projects: Project[], deletedProjects: Project[], templates: Project[], currentProject: Project | null, teamMembers: TeamMember[]
    - actions: setProjects(), setDeletedProjects(), setTemplates(), setCurrentProject(), setTeamMembers(), fetchProjects(), fetchTeamMembers(), createProject(), deleteProject(), restoreProject(), updateProject(), toggleLock()
    - `fetchProjects` 함수에서 utils/storage.ts의 saveProjects 사용
  - App.tsx에서 해당 useState들을 useProjectsStore 훅으로 교체

  **Must NOT do**:
  - 프로젝트 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 복잡한 비즈니스 로직 이동
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 7, 8)
  - **Blocks**: Task 12
  - **Blocked By**: Task 3, 4

  **References**:

  **Pattern References**:
  - App.tsx:427-454 (fetchTeamMembers 함수)
  - App.tsx:461-470 (fetchTemplates 함수)
  - App.tsx:477-598 (fetchProjects 함수)
  - App.tsx:600-623 (saveProjectsLocal 함수)
  - App.tsx:625-673 (syncProjectToSupabase 함수)
  - App.tsx:675-735 (handleDeleteProject 함수)
  - App.tsx:737-768 (handleRestoreProject 함수)
  - App.tsx:770-802 (handleToggleLock 함수)
  - App.tsx:1737-1872 (handleCreateProject 함수)
  - App.tsx:1939-1988 (handleUpdateProject 함수)

  **API/Type References**:
  - types.ts:84-119 (Project 인터페이스)
  - types.ts:20-26 (TeamMember 인터페이스)

  **Test References**:

  **Documentation References**:
  - Zustand async actions: https://docs.pmnd.rs/zustand/guides/async-actions

  **External References**:
  - Zustand with Supabase: https://supabase.com/docs/guides/auth-helpers/nextjs#using-zustand-for-state-management

  **Acceptance Criteria**:
  - [ ] useProjectsStore 훅 정의됨
  - [ ] 모든 프로젝트 관련 actions이 구현됨
  - [ ] App.tsx에서 해당 useState들이 useProjectsStore()로 교체됨
  - [ ] fetchProjects 함수에서 utils/storage.ts의 saveProjects 사용됨

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] store/projects.ts 파일 내용
  - [ ] App.tsx useProjectsStore 사용 코드

  **Commit**: YES
  - Message: `refactor: implement projects store with Zustand`
  - Files: store/projects.ts, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 7. tasks 스토어 생성

  **What to do**:
  - `store/tasks.ts` 구현:
    - `useTasksStore` 훅 생성
    - 상태: completedTasks: Set<string>, taskLinks: Map<string, {url: string, label: string}>
    - actions: setCompletedTasks(), setTaskLinks(), syncTasks(), toggleTask(), updateTask(), deleteTask(), addCustomTask(), updateRounds()
    - `syncTasks` 함수에서 utils/storage.ts의 saveLocalStorage 사용
    - Map/Set 재생성 방지: useMemo로 안정화 (아직 store에서는 불필요, 사용 시점에서 처리)
  - App.tsx에서 해당 useState들을 useTasksStore 훅으로 교체

  **Must NOT do**:
  - 태스크 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 태스크 관련 복잡한 로직 이동
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 6, 8)
  - **Blocks**: Task 13
  - **Blocked By**: Task 3, 4

  **References**:

  **Pattern References**:
  - App.tsx:844-856 (syncTasks 함수)
  - App.tsx:1066-1100 (handleToggleTask 함수)
  - App.tsx:1102-1146 (handleDeleteTask 함수)
  - App.tsx:1450-1524 (handleUpdateTask 함수)
  - App.tsx:1526-1629 (handleSaveTaskInfo 함수)
  - App.tsx:1300-1321 (handleUpdateRounds 함수)
  - App.tsx:1323-1361 (handleAddCustomTask 함수)
  - App.tsx:895-1043 (getVisibleTasks는 utils/taskHelpers.ts로 이동됨)

  **API/Type References**:
  - types.ts:37-48 (Task 인터페이스)

  **Test References**:

  **Documentation References**:
  - Zustand Set/Map 다루기: https://docs.pmnd.rs/zustand/guides/how-to-update-state

  **External References**:
  - Zustand performance patterns: https://github.com/pmndrs/zustand/blob/main/docs/guides/performance.md

  **Acceptance Criteria**:
  - [ ] useTasksStore 훅 정의됨
  - [ ] 모든 태스크 관련 actions이 구현됨
  - [ ] App.tsx에서 해당 useState들이 useTasksStore()로 교체됨
  - [ ] syncTasks 함수에서 utils/storage.ts의 saveLocalStorage 사용됨

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] store/tasks.ts 파일 내용
  - [ ] App.tsx useTasksStore 사용 코드

  **Commit**: YES
  - Message: `refactor: implement tasks store with Zustand`
  - Files: store/tasks.ts, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 8. ui 스토어 생성

  **What to do**:
  - `store/ui.ts` 구현:
    - `useUIStore` 훅 생성
    - 상태: rounds: number, rounds2: number, roundsNavigation: number, toastMsg: string | null, activeRole: Role, isSnapshotMode: boolean, snapshotSelectedTasks: Set<string>, confirmHideExpedition2: boolean, popover: PopoverState, taskEditPopover: TaskEditPopoverState, showCreateModal: boolean, showTeamModal: boolean, showTemplateSaveModal: boolean, showDeletedDataModal: boolean, showTemplateManagerModal: boolean
    - actions: setRounds(), setRounds2(), setRoundsNavigation(), setToastMsg(), setActiveRole(), setIsSnapshotMode(), setSnapshotSelectedTasks(), setConfirmHideExpedition2(), setPopover(), setTaskEditPopover(), showCreateModal(), hideCreateModal(), showTeamModal(), hideTeamModal(), showTemplateSaveModal(), hideTemplateSaveModal(), showDeletedDataModal(), hideDeletedDataModal(), showTemplateManagerModal(), hideTemplateManagerModal()
    - showToast 함수 구현 (TOAST_DURATION_MS 사용)
  - App.tsx에서 해당 useState들을 useUIStore 훅으로 교체

  **Must NOT do**:
  - UI 상태 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순한 UI 상태 setter 함수들
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5-7)
  - **Blocks**: Task 10, 11
  - **Blocked By**: Task 3, 4

  **References**:

  **Pattern References**:
  - App.tsx:456-459 (showToast 함수 → TOAST_DURATION_MS 사용)
  - App.tsx:61-99 (모든 UI 관련 useState)

  **API/Type References**:
  - types.ts:64-71 (PopoverState 인터페이스)
  - types.ts:73-82 (TaskEditPopoverState 인터페이스)
  - types.ts:2-9 (Role enum)

  **Test References**:

  **Documentation References**:
  - Zustand simple store: https://docs.pmnd.rs/zustand/getting-started/introduction

  **External References**:
  - Zustand modal state pattern: https://dev.to/sagarkp126/how-to-handle-multiple-modals-in-react-using-zustand-4o2n

  **Acceptance Criteria**:
  - [ ] useUIStore 훅 정의됨
  - [ ] 모든 UI 관련 actions이 구현됨
  - [ ] showToast 함수에서 TOAST_DURATION_MS 상수 사용됨
  - [ ] App.tsx에서 해당 useState들이 useUIStore()로 교체됨

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] store/ui.ts 파일 내용
  - [ ] App.tsx useUIStore 사용 코드

  **Commit**: YES
  - Message: `refactor: implement UI store with Zustand`
  - Files: store/ui.ts, App.tsx
  - Pre-commit: `bun test`

---

### Wave 4: 컴포넌트 분리 (UI)

- [ ] 9. AuthFlow 컴포넌트 분리

  **What to do**:
  - `components/AuthFlow.tsx` 생성:
    - WelcomeScreen, AuthScreen 관련 로직 통합
    - 로딩 스크린, 로그인/로그아웃 UI
  - App.tsx에서 해당 JSX 코드 분리하여 AuthFlow 컴포넌트로 이동

  **Must NOT do**:
  - 인증 플로우 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 분리 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 디자인 일관성 유지

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10, 11)
  - **Blocks**: Task 14
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - App.tsx:2694-2706 (WelcomeScreen 렌더링)
  - App.tsx:2699-2706 (AuthScreen, 로딩 스크린 렌더링)

  **API/Type References**:
  - components/WelcomeScreen.tsx
  - components/AuthScreen.tsx

  **Test References**:

  **Documentation References**:
  - React 컴포넌트 분리 가이드: https://react.dev/learn/extracting-components-into-a-function

  **External References**:
  - Auth component patterns: https://github.com/supabase-community/auth-ui-react

  **Acceptance Criteria**:
  - [ ] components/AuthFlow.tsx 생성됨
  - [ ] AuthFlow 컴포넌트가 useAuthStore 사용
  - [ ] App.tsx에서 해당 JSX 코드가 AuthFlow 컴포넌트로 교체됨
  - [ ] 인증 플로우가 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] components/AuthFlow.tsx 파일 내용
  - [ ] App.tsx AuthFlow 사용 코드

  **Commit**: YES
  - Message: `refactor: extract AuthFlow component`
  - Files: components/AuthFlow.tsx, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 10. ModalManager 컴포넌트 분리

  **What to do**:
  - `components/ModalManager.tsx` 생성:
    - 모든 모달 관리 (CreateProjectModal, TeamManagementModal, DeletedDataModal, TemplateManagerModal, TemplateSaveModal)
    - useUIStore에서 모달 상태들 가져와서 렌더링
  - App.tsx에서 모든 모달 관련 JSX 코드 분리

  **Must NOT do**:
  - 모달 동작 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 분리 작업
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 9, 11)
  - **Blocks**: Task 14
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - App.tsx:2732-2751 (CreateProjectModal 렌더링)
  - App.tsx:2741-2751 (TeamManagementModal 렌더링)
  - App.tsx:2778-2787 (DeletedDataModal 렌더링)
  - App.tsx:2789-2796 (TemplateManagerModal 렌더링)
  - App.tsx:2747-2755 (TemplateSaveModal 렌더링)

  **API/Type References**:
  - components/CreateProjectModal.tsx
  - components/TeamManagementModal.tsx
  - components/DeletedDataModal.tsx
  - components/TemplateManagerModal.tsx
  - components/TemplateSaveModal.tsx

  **Test References**:

  **Documentation References**:
  - React Portal 패턴: https://react.dev/reference/react-dom/createPortal

  **External References**:
  - Modal state management pattern: https://www.patterns.dev/posts/modal-component/

  **Acceptance Criteria**:
  - [ ] components/ModalManager.tsx 생성됨
  - [ ] ModalManager 컴포넌트가 useUIStore 사용
  - [ ] App.tsx에서 모든 모달 관련 JSX가 ModalManager로 교체됨
  - [ ] 모든 모달이 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] components/ModalManager.tsx 파일 내용
  - [ ] App.tsx ModalManager 사용 코드

  **Commit**: YES
  - Message: `refactor: extract ModalManager component`
  - Files: components/ModalManager.tsx, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 11. Toaster 컴포넌트 분리

  **What to do**:
  - `components/Toaster.tsx` 생성:
    - toast 메시지 렌더링 로직 분리
    - useUIStore에서 toastMsg 상태 가져와서 렌더링
  - App.tsx에서 toast 관련 JSX 코드 분리

  **Must NOT do**:
  - toast 동작 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 분리 작업
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 9, 10)
  - **Blocks**: Task 14
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - App.tsx:2756-2775 (toastMsg 렌더링)

  **API/Type References**:

  **Test References**:

  **Documentation References**:
  - Toast notification patterns: https://www.patterns.dev/posts/toast/

  **External References**:
  - React toast libraries: https://github.com/fkhadra/react-toastify

  **Acceptance Criteria**:
  - [ ] components/Toaster.tsx 생성됨
  - [ ] Toaster 컴포넌트가 useUIStore 사용
  - [ ] App.tsx에서 toast 관련 JSX가 Toaster로 교체됨
  - [ ] toast 동작이 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] components/Toaster.tsx 파일 내용
  - [ ] App.tsx Toaster 사용 코드

  **Commit**: YES
  - Message: `refactor: extract Toaster component`
  - Files: components/Toaster.tsx, App.tsx
  - Pre-commit: `bun test`

---

### Wave 5: 핵심 컴포넌트 분리 및 App.tsx 리팩토링

- [ ] 12. ProjectDashboard 컴포넌트 분리

  **What to do**:
  - `components/ProjectDashboard.tsx` 생성:
    - ProjectList 관련 로직 및 JSX 이동
    - 프로젝트 목록, 삭제된 프로젝트, 템플릿 관리
  - App.tsx에서 ProjectList 관련 코드 분리

  **Must NOT do**:
  - 프로젝트 대시보드 기능 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 분리 작업
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 13)
  - **Blocks**: Task 14
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - App.tsx:2712-2753 (ProjectList 렌더링)

  **API/Type References**:
  - components/ProjectList.tsx

  **Test References**:

  **Documentation References**:
  - List component patterns: https://www.patterns.dev/posts/list-view/

  **External References**:
  - React data grid patterns: https://mui.com/x/react-data-grid/

  **Acceptance Criteria**:
  - [ ] components/ProjectDashboard.tsx 생성됨
  - [ ] ProjectDashboard 컴포넌트가 useProjectsStore 사용
  - [ ] App.tsx에서 ProjectList 관련 코드가 ProjectDashboard로 교체됨
  - [ ] 프로젝트 대시보드 기능이 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] components/ProjectDashboard.tsx 파일 내용
  - [ ] App.tsx ProjectDashboard 사용 코드

  **Commit**: YES
  - Message: `refactor: extract ProjectDashboard component`
  - Files: components/ProjectDashboard.tsx, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 13. TaskManager 컴포넌트 분리

  **What to do**:
  - `components/TaskManager.tsx` 생성:
    - 태스크 관련 로직 및 JSX 이동
    - StepColumn 렌더링, 라운드 컨트롤, 엑셀 임포트/익스포트
    - getVisibleTasks 함수 사용 (utils/taskHelpers.ts에서 import)
    - calculateTotalTasks 함수 사용 (utils/taskHelpers.ts에서 import)
  - App.tsx에서 태스크 관련 코드 분리
  - Map/Set 재생성 문제 해결: useMemo로 안정화

  **Must NOT do**:
  - 태스크 관리 기능 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 분리 작업
  - **Skills**: [`vercel-react-best-practices`, `frontend-ui-ux`]
    - `vercel-react-best-practices`: useMemo, useCallback 최적화 패턴
    - `frontend-ui-ux`: 디자인 일관성 유지

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 12)
  - **Blocks**: Task 14
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - App.tsx:2755-3097 (태스크 관련 렌더링: StepColumn, 라운드 컨트롤)
  - App.tsx:818-842 (loadTasks 함수 - Map/Set 재생성 문제)
  - App.tsx:2293-2663 (handleImportFromExcel - 복잡한 함수)
  - App.tsx:2111-2291 (handleExportToExcel - 복잡한 함수)

  **API/Type References**:
  - components/StepColumn.tsx
  - utils/taskHelpers.ts (getVisibleTasks, calculateTotalTasks)

  **Test References**:

  **Documentation References**:
  - React useMemo 패턴: https://react.dev/reference/react/useMemo
  - React useCallback 패턴: https://react.dev/reference/react/useCallback

  **External References**:
  - React performance optimization: https://www.patterns.dev/posts/presentational-and-container-components/

  **Acceptance Criteria**:
  - [ ] components/TaskManager.tsx 생성됨
  - [ ] TaskManager 컴포넌트가 useTasksStore, useProjectsStore 사용
  - [ ] getVisibleTasks, calculateTotalTasks를 utils/taskHelpers.ts에서 import 사용
  - [ ] Map/Set 재생성 문제가 useMemo로 해결됨
  - [ ] App.tsx에서 태스크 관련 코드가 TaskManager로 교체됨
  - [ ] 태스크 관리 기능이 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] components/TaskManager.tsx 파일 내용
  - [ ] App.tsx TaskManager 사용 코드
  - [ ] useMemo 사용 코드 (Map/Set 안정화)

  **Commit**: YES
  - Message: `refactor: extract TaskManager component with performance optimization`
  - Files: components/TaskManager.tsx, App.tsx
  - Pre-commit: `bun test`

---

- [ ] 14. App.tsx 리팩토링 (상태 교체 + 컴포넌트 통합)

  **What to do**:
  - App.tsx 리팩토링:
    - 모든 useState 삭제 (Zustand 스토어 사용)
    - 분리된 컴포넌트들 import (AuthFlow, ModalManager, Toaster, ProjectDashboard, TaskManager)
    - App.tsx를 코디네이터 역할만 남도록 축소 (500줄 이하)
    - remaining useEffect들 정리 및 필요시 useUIStore/useAuthStore 등으로 이동
  - 타입 안정성 개선:
    - 모든 `any` 타입 제거
    - 모든 `as any` 타입 단언 제거
    - 적절한 타입 정의 (types.ts에 필요시 추가)
  - checkEmailAuthorization 함수 정리:
    - FIXME 주석 제거
    - 항상 true 반환 로직 유지 (단순화)
  - 코드 중복 제거:
    - localStorage.setItem 호출들이 utils/storage.ts로 대체됨
    - Supabase 업데이트 패턴이 정리됨

  **Must NOT do**:
  - 기능 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 전체 앱 구조 재조립
  - **Skills**: [`vercel-react-best-practices`, `vercel-react-native-skills`]
    - `vercel-react-best-practices`: 상태 관리, 성능 최적화 패턴
    - `vercel-react-native-skills`: 필요한 경우 React 성능 패턴 참조

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 9-13

  **References**:

  **Pattern References**:
  - App.tsx:37-3101 (전체 App.tsx 구조)
  - store/auth.ts (useAuthStore)
  - store/projects.ts (useProjectsStore)
  - store/tasks.ts (useTasksStore)
  - store/ui.ts (useUIStore)
  - components/AuthFlow.tsx
  - components/ModalManager.tsx
  - components/Toaster.tsx
  - components/ProjectDashboard.tsx
  - components/TaskManager.tsx

  **API/Type References**:
  - types.ts (모든 인터페이스)

  **Test References**:

  **Documentation References**:
  - React 공식 문서: https://react.dev/
  - TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict

  **External References**:
  - Zustand best practices: https://docs.pmnd.rs/zustand/guides/performance

  **Acceptance Criteria**:
  - [ ] App.tsx가 500줄 이하로 축소됨
  - [ ] 모든 useState가 삭제되고 Zustand 스토어 훅들로 교체됨
  - [ ] 모든 `any` 타입이 제거됨
  - [ ] 모든 `as any` 타입 단언이 제거됨
  - [ ] checkEmailAuthorization 함수가 정리됨 (FIXME 제거, 항상 true 반환)
  - [ ] localStorage.setItem 중복이 제거됨
  - [ ] 모든 분리된 컴포넌트들이 import되어 사용됨
  - [ ] 모든 기능이 기존과 동일하게 작동

  **Automated Verification**:
  ```bash
  # Agent runs:
  bun test
  # Assert: Exit code 0

  # Check App.tsx line count
  wc -l App.tsx
  # Assert: Output <= 500

  # Check for any types
  grep -n ": any" App.tsx | grep -v "//"
  # Assert: Output is empty

  # Check for as any assertions
  grep -n "as any" App.tsx
  # Assert: Output is empty
  ```

  **Evidence to Capture**:
  - [ ] App.tsx 최종 버전 파일 내용
  - [ ] wc -l 출력 (줄 수 확인)
  - [ ] grep 명령어 출력 (any/as any 확인)
  - [ ] 터미널 출력 (bun test 통과 확인)

  **Commit**: YES (final)
  - Message: `refactor: complete App.tsx restructuring with Zustand and component extraction`
  - Files: App.tsx
  - Pre-commit: `bun test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore: add Vitest test infrastructure` | package.json, vitest.config.ts, __tests__/ | bun test |
| 2 | `refactor: extract magic numbers to constants` | constants/*.ts, App.tsx | bun test |
| 3 | `refactor: extract utility functions to dedicated modules` | utils/*.ts, App.tsx | bun test |
| 4 | `feat: add Zustand store architecture` | store/*.ts, package.json | bun test |
| 5 | `refactor: implement auth store with Zustand` | store/auth.ts, App.tsx | bun test |
| 6 | `refactor: implement projects store with Zustand` | store/projects.ts, App.tsx | bun test |
| 7 | `refactor: implement tasks store with Zustand` | store/tasks.ts, App.tsx | bun test |
| 8 | `refactor: implement UI store with Zustand` | store/ui.ts, App.tsx | bun test |
| 9 | `refactor: extract AuthFlow component` | components/AuthFlow.tsx, App.tsx | bun test |
| 10 | `refactor: extract ModalManager component` | components/ModalManager.tsx, App.tsx | bun test |
| 11 | `refactor: extract Toaster component` | components/Toaster.tsx, App.tsx | bun test |
| 12 | `refactor: extract ProjectDashboard component` | components/ProjectDashboard.tsx, App.tsx | bun test |
| 13 | `refactor: extract TaskManager component with performance optimization` | components/TaskManager.tsx, App.tsx | bun test |
| 14 | `refactor: complete App.tsx restructuring` | App.tsx | bun test |

---

## Success Criteria

### Verification Commands
```bash
# Run all tests
bun test
# Expected: All tests pass

# Check App.tsx line count
wc -l App.tsx
# Expected: <= 500

# Check for any types
grep -n ": any" App.tsx | grep -v "//"
# Expected: Empty

# Check for as any assertions
grep -n "as any" App.tsx
# Expected: Empty

# Check for hardcoded timeouts
grep -n "setTimeout.*[0-9]" App.tsx | grep -v "TIMEOUT"
# Expected: Empty
```

### Final Checklist
- [ ] App.tsx가 500줄 이하로 축소됨
- [ ] 모든 useState가 Zustand 스토어로 이동됨
- [ ] `any` 타입 0개
- [ ] `as any` 0개
- [ ] 매직 넘버 모두 상수화됨
- [ ] Map/Set 재생성 문제 해결됨
- [ ] localStorage.setItem 중복 제거됨
- [ ] 테스트 인프라 설정 완료됨
- [ ] 모든 테스트 통과 (bun test)
- [ ] 모든 기능이 기존과 동일하게 작동
- [ ] 로컬에서만 작업, GitHub에 푸시하지 않음
