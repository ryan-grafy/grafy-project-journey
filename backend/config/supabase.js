const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * 모든 활성 프로젝트 조회
 */
async function getActiveProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .neq('status', -99); // 삭제된 프로젝트 제외
  
  if (error) throw error;
  return data;
}

/**
 * 프로젝트 단일 조회
 */
async function getProjectById(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * 특정 경로의 프로젝트 찾기
 */
async function findProjectByFolderPath(nasFolderPath) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('nas_folder_path', nasFolderPath)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * 프로젝트 NAS 정보 업데이트
 */
async function updateProjectNASInfo(projectId, updates) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('projects')
    .update({
      ...updates,
      nas_last_synced: now,
      last_updated: updates.last_updated || now
    })
    .eq('id', projectId);
  
  if (error) throw error;
  return true;
}

module.exports = {
  supabase,
  getActiveProjects,
  getProjectById,
  findProjectByFolderPath,
  updateProjectNASInfo
};
