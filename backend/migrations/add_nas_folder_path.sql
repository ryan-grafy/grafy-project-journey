-- NAS 폴더 경로 컬럼 추가 마이그레이션
-- 실행: Supabase SQL Editor에서 직접 실행

-- nas_folder_path 컬럼 추가 (이미 있다면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'nas_folder_path'
  ) THEN
    ALTER TABLE projects
    ADD COLUMN nas_folder_path TEXT;

    COMMENT ON COLUMN projects.nas_folder_path IS 'NAS 폴더 전체 경로 (예: \\\\192.168.2.2\\#Project# 2026 GRAFY. 프로젝트\\260130-260315_클라이언트_프로젝트명_담당자)';
  END IF;
END $$;

-- 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_nas_folder_path ON projects(nas_folder_path);

-- nas_folder_created 컬럼 추가 (선택사항 - 폴더 생성 여부 추적)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'nas_folder_created'
  ) THEN
    ALTER TABLE projects
    ADD COLUMN nas_folder_created BOOLEAN DEFAULT false;

    COMMENT ON COLUMN projects.nas_folder_created IS 'NAS 폴더 생성 완료 여부';
  END IF;
END $$;

-- nas_creation_error 컬럼 추가 (선택사항 - 폴더 생성 에러 기록)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'nas_creation_error'
  ) THEN
    ALTER TABLE projects
    ADD COLUMN nas_creation_error TEXT;

    COMMENT ON COLUMN projects.nas_creation_error IS 'NAS 폴더 생성 에러 메시지';
  END IF;
END $$;

-- nas_last_synced 컬럼 추가 (선택사항 - 마지막 동기화 시각)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'nas_last_synced'
  ) THEN
    ALTER TABLE projects
    ADD COLUMN nas_last_synced TIMESTAMP;

    COMMENT ON COLUMN projects.nas_last_synced IS 'NAS 마지막 동기화 시각';
  END IF;
END $$;
