-- ============================================================
-- team_members 테이블 재생성 (id를 TEXT 타입으로 수정)
-- 
-- ⚠️ 주의: 기존 team_members 테이블이 삭제됩니다!
-- 실행: Supabase 대시보드 > SQL Editor에서 실행
-- ============================================================

-- 1. 기존 테이블 삭제 (있으면)
DROP TABLE IF EXISTS team_members;

-- 2. TEXT 타입 id로 테이블 재생성
CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS 활성화
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 4. 누구나 접근 가능하도록 정책 설정
CREATE POLICY "Allow all select on team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow all insert on team_members" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on team_members" ON team_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on team_members" ON team_members FOR DELETE USING (true);
