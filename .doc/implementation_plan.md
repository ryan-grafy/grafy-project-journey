# 엑셀 가져오기 및 진행률 로직 수정

## 1. 목표
두 가지 치명적인 문제를 수정합니다:
1.  **엑셀 가져오기 그룹화**: 엑셀의 "그룹" 셀이 비어있을 때 "그룹 끊기"로 인식하는 문제로 인해 Step 3 등의 그룹이 깨지는 현상이 발생합니다. 이를 "이전 그룹 상속"으로 변경하여 수정합니다.
2.  **진행률 바 정확도**: `calculateTotalTasks` 함수가 숨겨진 태스크(`hidden_template_tasks`)나 숨겨진 스텝(Expedition 2)을 제외하지 않아, 태스크를 비활성화해도 진행률이 100%나 부정확한 수치로 표시되는 문제를 수정합니다.

## 2. 변경 제안

### 로직 개선
#### `App.tsx`

1.  **`handleImportFromExcel` 수정**:
    *   "그룹" 열(`그룹`) 파싱 로직 변경.
    *   **현재**: 셀이 비어있으면 `currentGroupName = null` (그룹 해제).
    *   **변경**: 셀이 비어있으면 `currentGroupName` 유지 (상속). 명시적으로 그룹을 끊어야 할 때만 해제하도록 변경 (엑셀의 일반적인 사용성과 일치). 단, **스텝이 바뀔 때는 그룹을 초기화**하여 스텝 간 그룹 꼬임을 방지합니다.
    *   **추가 수정**: `STEPS_STATIC`을 순회하면서 태스크를 찾던 기존 로직이 Step 2, 3, 4의 라운드 태스크를 제대로 매칭하지 못하는 부분을 수정하여, 라운드 태스크 ID(`tX-round-Y-Z`) 패턴을 정확히 인식하고 매핑하도록 개선합니다.

2.  **`calculateTotalTasks` 업데이트**:
    *   `project.task_states?.meta?.hidden_template_tasks` 목록에 있는 태스크 ID는 전체 카운트에서 제외합니다.
    *   `is_expedition2_hidden` (Step 4 숨김) 상태를 확인하여, 참일 경우 Step 4 태스크는 카운트하지 않습니다.
    *   `deleted_tasks` 제외 로직은 유지합니다.

## 3. 상세 코드 변경

### `App.tsx`

#### [수정] `handleImportFromExcel`
```typescript
// 파싱 루프 내부:
// ...
// 그룹 파싱 로직
const groupVal = row["그룹"];
if (groupVal === "/") {
  // 명시적 상속 (기존 유지)
} else if (groupVal && groupVal.trim() !== "") {
    currentGroupName = groupVal;
} else {
    // 빈 셀 -> 이전 행에서 상속 (엑셀 표준 동작)
    // 이전: currentGroupName = null;
    // 변경: currentGroupName 유지
}

// 중요: 스텝이 변경될 때는 그룹 초기화
if (currentStepId !== lastStepId) {
    currentGroupName = null;
    // ... 그룹 다시 파싱 ...
}

// 추가: 라운드 태스크 ID 매핑 강화 (Step 2, 3, 4)
// 기존 로직이 정적 태스크만 찾고 라운드 태스크 식별에 취약할 수 있음.
// ID가 없는 경우, 제목/패턴으로 추론하거나 정규식으로 라운드 ID 생성/매칭 로직 보완
```

#### [수정] `calculateTotalTasks`
```typescript
const calculateTotalTasks = (project: Project) => {
    let count = 0;
    const deletedSet = new Set(project.deleted_tasks || []);
    // 추가: 숨겨진 태스크 셋
    const hiddenSet = new Set(project.task_states?.meta?.hidden_template_tasks || []);
    const isEmp2Hidden = project.task_states?.meta?.is_expedition2_hidden;

    STEPS_STATIC.forEach((step) => {
        // ...
        // Step 4가 숨겨져 있으면 카운트 건너뛰기
        if (step.id === 4 && isEmp2Hidden) return;

        // 태스크 루프 내부 (Step 2, 3, 4 등):
        // 변경 전: if (!deletedSet.has(id))
        // 변경 후: if (!deletedSet.has(id) && !hiddenSet.has(id))
    });
    // ...
}
```

## 4. 검증 계획

### 수동 검증
1.  **진행률 바**:
    *   프로젝트를 엽니다.
    *   (-) 버튼을 사용하여 "Expedition 2" (Step 4)를 숨깁니다.
    *   진행률(%)이 업데이트되는지 확인합니다(분모가 줄어들어 퍼센트가 올라가거나, 완료된 태스크만 남아서 100%가 되어야 함).
    *   UI에서 보이지 않는 "숨겨진" 항목들이 전체 개수(분모)에 영향을 주지 않는지 확인합니다.
2.  **엑셀 가져오기**:
    *   현재 프로젝트를 엑셀로 내보내기 합니다.
    *   엑셀을 열고(또는 수정 시뮬레이션), 그룹 중간에 있는 "그룹" 셀 이름을 지웁니다(빈칸으로 만듦).
    *   수정된 엑셀을 다시 가져오기 합니다.
    *   UI에서 태스크들이 여전히 올바르게 그룹화되어 있는지 확인합니다(그룹 헤더 유지, 항목들이 둥근 박스 안에 위치).
    *   특히 Step 3 그룹이 깨지지 않는지 확인합니다.
