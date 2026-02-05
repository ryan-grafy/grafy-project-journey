const nasApi = require('../utils/synoApi');
const supabase = require('../config/supabase');
const { parseFolderName, generateFolderName } = require('../utils/folderNameParser');

// folderService.js와 동일한 기준 경로 사용
const NAS_BASE_PATH = '/GRAFY/#Project/# 2026 GRAFY. 프로젝트';

let lastNasFolderPaths = null;

/**
 * NAS 폴더와 DB 간의 동기화 수행
 */
async function syncNasFolders() {
  console.log(`[SYNC] NAS 동기화 시작: ${new Date().toLocaleString()}`);
  
  try {
    // 1. NAS에서 실제 폴더 목록 가져오기
    const nasFolders = await nasApi.listFolders(NAS_BASE_PATH);
    const nasFolderPaths = new Set(nasFolders.map(f => f.path));
    const nasFolderByPath = new Map(nasFolders.map(f => [f.path, f]));
    const renamedPaths = new Set();
    const addedPaths = lastNasFolderPaths
      ? [...nasFolderPaths].filter(path => !lastNasFolderPaths.has(path))
      : [];
    const removedPaths = lastNasFolderPaths
      ? [...lastNasFolderPaths].filter(path => !nasFolderPaths.has(path))
      : [];
    lastNasFolderPaths = new Set(nasFolderPaths);
    
    // 2. DB에서 NAS 연동된 프로젝트들 가져오기
    const projects = await supabase.getActiveProjects();
    const syncedProjects = projects.filter(p => p.nas_folder_path && p.nas_folder_path.length > 0);
    const projectByPath = new Map(syncedProjects.map(project => [project.nas_folder_path, project]));

    console.log(`[SYNC] 대상 프로젝트 수: ${syncedProjects.length}`);

    // 2-1. 폴더명 변경(삭제+추가) 스냅샷 기반 추적
    if (removedPaths.length > 0 && addedPaths.length > 0) {
      await handleSnapshotRenames({
        removedPaths,
        addedPaths,
        nasFolders,
        projectByPath,
        syncedProjects
      });
    }

    // 3. DB -> NAS 변경 반영 (웹앱 수정사항)
    for (const project of syncedProjects) {
      if (!project.nas_folder_path) continue;
      if (!nasFolderPaths.has(project.nas_folder_path)) continue;
      if (renamedPaths.has(project.nas_folder_path)) continue;

      const nasFolder = nasFolderByPath.get(project.nas_folder_path);
      if (!nasFolder) continue;

      const desiredName = buildDesiredFolderName(project);
      if (!desiredName || desiredName === nasFolder.name) continue;

      if (!shouldApplyDbChanges(project)) continue;

      console.log(`[SYNC] DB 변경 감지: ${nasFolder.name} -> ${desiredName}`);
      const result = await nasApi.renameFolder(project.nas_folder_path, desiredName);
      if (result.success) {
        const parentPath = project.nas_folder_path.split('/').slice(0, -1).join('/');
        const newPath = `${parentPath}/${desiredName}`;
        renamedPaths.add(project.nas_folder_path);
        renamedPaths.add(newPath);
        nasFolderPaths.delete(project.nas_folder_path);
        nasFolderPaths.add(newPath);
        nasFolderByPath.set(newPath, { ...nasFolder, name: desiredName, path: newPath });
        project.nas_folder_path = newPath;
        await supabase.updateProjectNASInfo(project.id, {
          name: project.name,
          start_date: project.start_date,
          end_date: project.end_date,
          pm_name: project.pm_name,
          designer_name: project.designer_name,
          designer_2_name: project.designer_2_name,
          designer_3_name: project.designer_3_name,
          nas_folder_path: newPath
        });
        console.log(`✅ [SYNC] NAS 폴더명 업데이트 완료: ${project.id}`);
      }
    }

    // 4. 누락된 폴더 또는 이름 변경 확인 (NAS -> DB)
    for (const project of syncedProjects) {
      if (!nasFolderPaths.has(project.nas_folder_path)) {
        console.log(`[SYNC] 변경 감지: ${project.nas_folder_path}`);
        
        const match = findRenamedMatch(project, nasFolders, syncedProjects);
        
        if (match) {
          console.log(`[SYNC] 이름 변경 확인: ${project.nas_folder_path} -> ${match.path}`);
            await updateProjectFromFolder(project, match);
        }
      }
    }
    
    console.log(`[SYNC] NAS 동기화 정상 완료`);
  } catch (error) {
    console.error(`[SYNC] 동기화 실패:`, error.message);
  }
}

function buildDesiredFolderName(project) {
  const designerNames = [
    project.designer_name,
    project.designer_2_name,
    project.designer_3_name
  ].filter(Boolean);

  return generateFolderName({
    name: project.name,
    startDate: project.start_date,
    endDate: project.end_date || 'xxxxxx',
    pmName: project.pm_name,
    designerNames
  });
}

function shouldApplyDbChanges(project) {
  if (!project.last_updated) return false;
  if (!project.nas_last_synced) return true;

  const lastUpdated = new Date(project.last_updated).getTime();
  const lastSynced = new Date(project.nas_last_synced).getTime();
  if (isNaN(lastUpdated) || isNaN(lastSynced)) return false;

  return lastUpdated > lastSynced;
}

async function handleSnapshotRenames({ removedPaths, addedPaths, nasFolders, projectByPath, syncedProjects }) {
  for (const oldPath of removedPaths) {
    const project = projectByPath.get(oldPath);
    if (!project) continue;

    let newPath = null;
    if (addedPaths.length === 1) {
      newPath = addedPaths[0];
    } else {
      const match = findRenamedMatch(project, nasFolders, syncedProjects);
      newPath = match?.path || null;
    }

    if (!newPath) continue;
    const folder = nasFolders.find(f => f.path === newPath);
    if (!folder) continue;

    console.log(`[SYNC] 스냅샷 변경 확인: ${oldPath} -> ${newPath}`);
    await updateProjectFromFolder(project, folder);
  }
}

async function updateProjectFromFolder(project, folder) {
  const parsed = parseFolderName(folder.name);
  if (!parsed) {
    console.warn(`⚠️ 폴더명 파싱 실패: ${folder.name}`);
    return;
  }

  const updates = buildUpdatesFromParsed(parsed, folder.path, project);
  await supabase.updateProjectNASInfo(project.id, updates);
  console.log(`✅ [SYNC] 업데이트 완료: ${project.id}`);
}

function buildUpdatesFromParsed(parsed, folderPath, project) {
  // NAS 폴더명에서 파싱한 담당자 정보 (이름만)
  const responsible = Array.isArray(parsed.responsible) ? parsed.responsible : [];
  
  // ⚠️ 중요: NAS 폴더명 기준 vs DB 기준
  // NAS 폴더명에 담당자가 있으면 NAS 기준 사용 (이름만 저장됨)
  // NAS 폴더명에 담당자가 없으면 기존 DB 값 유지
  // 이렇게 해야 사용자가 NAS에서 "예지"로 변경하면 DB도 "예지"가 됨
  const pmName = project?.pm_name || responsible[0] || null;
  const designerName = project?.designer_name || responsible[1] || null;
  const designer2Name = project?.designer_2_name || responsible[2] || null;
  const designer3Name = project?.designer_3_name || responsible[3] || null;
  
  return {
    name: `${parsed.client} / ${parsed.projectName}`,
    start_date: parsed.startDate,
    end_date: parsed.endDate,
    nas_folder_path: folderPath,
    pm_name: pmName,
    designer_name: designerName,
    designer_2_name: designer2Name,
    designer_3_name: designer3Name
  };
}

function findRenamedMatch(project, allNasFolders, allSyncedProjects) {
  const occupiedPaths = new Set(allSyncedProjects.map(p => p.nas_folder_path));
  const availableFolders = allNasFolders.filter(f => !occupiedPaths.has(f.path));
  if (availableFolders.length === 1) {
    return availableFolders[0];
  }

  let bestScore = 0;
  let bestFolder = null;
  let bestTie = false;
  
  for (const folder of availableFolders) {
    const parsed = parseFolderName(folder.name);
    if (!parsed) continue;
    
    // 폴더 경로에서 마지막 이름만 추출하여 비교
    const oldName = project.nas_folder_path.split('/').pop();
    const originalParsed = parseFolderName(oldName);
    
    if (originalParsed) {
      const score = scoreFolderMatch(originalParsed, parsed);
      if (score > bestScore) {
        bestScore = score;
        bestFolder = folder;
        bestTie = false;
      } else if (score === bestScore && score > 0) {
        bestTie = true;
      }
    }
  }
  if (!bestFolder || bestTie || bestScore < 2) return null;
  return bestFolder;
}

function scoreFolderMatch(originalParsed, parsed) {
  let score = 0;
  if (parsed.startDate && parsed.startDate === originalParsed.startDate) score += 1;
  if (parsed.endDate === originalParsed.endDate) score += 1;
  if (parsed.client && parsed.client === originalParsed.client) score += 1;
  if (parsed.projectName && parsed.projectName === originalParsed.projectName) score += 1;

  const originalPeople = new Set(originalParsed.responsible || []);
  const parsedPeople = new Set(parsed.responsible || []);
  let overlap = 0;
  for (const name of parsedPeople) {
    if (originalPeople.has(name)) overlap += 1;
  }
  if (overlap > 0) score += 1;

  return score;
}

function startSyncService(intervalMs = 300000) {
  syncNasFolders().catch(console.error);
  setInterval(() => {
    syncNasFolders().catch(console.error);
  }, intervalMs);
  
  console.log(`⏲️ NAS 폴링 동기화 서비스 가동 (주기: ${intervalMs / 1000}초)`);
}

module.exports = {
  syncNasFolders,
  startSyncService
};
