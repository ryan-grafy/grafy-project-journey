-- NAS 컬럼에 대한 RLS(Row Level Security) 정책 추가
-- 실행: Supabase SQL Editor에서 직접 실행

-- NAS 컬럼 업데이트 정책
DROP POLICY IF EXISTS "Users can update nas_folder_path" ON projects;

CREATE POLICY "Users can update nas_folder_path"
ON projects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- nas_folder_created 업데이트 허용
DROP POLICY IF EXISTS "Users can update nas_folder_created" ON projects;

CREATE POLICY "Users can update nas_folder_created"
ON projects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- nas_creation_error 업데이트 허용
DROP POLICY IF EXISTS "Users can update nas_creation_error" ON projects;

CREATE POLICY "Users can update nas_creation_error"
ON projects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- nas_last_synced 업데이트 허용
DROP POLICY IF EXISTS "Users can update nas_last_synced" ON projects;

CREATE POLICY "Users can update nas_last_synced"
ON projects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
