const synoApi = require('../utils/synoApi');
const FOLDER_STRUCTURE = require('../config/folderStructure');
const { generateFolderName } = require('../utils/folderNameParser');
const supabase = require('../config/supabase');

function normalizeBasePath(rawBasePath) {
  if (!rawBasePath) return rawBasePath;

  let normalized = String(rawBasePath).trim();
  if (!normalized) return normalized;

  normalized = normalized.replace(/\\/g, "/");
  const uncMatch = normalized.match(/^\/\/[^/]+\/(.+)$/);
  if (uncMatch) {
    normalized = `/${uncMatch[1]}`;
  }
  normalized = normalized.replace(/\/+/g, "/").replace(/\/+$/g, "");
  const shareMatch = normalized.match(/^\/([^/]+)(\/|$)/);
  if (shareMatch && shareMatch[1].toLowerCase() === "grafy") {
    normalized = `/GRAFY${normalized.slice(shareMatch[1].length + 1)}`;
  }
  return normalized;
}

const DEFAULT_NAS_BASE_PATH = '/GRAFY/#Project/# 2026 GRAFY. 프로젝트';
const rawBasePath = process.env.NAS_BASE_PATH;
const resolvedBasePath = rawBasePath && rawBasePath.includes('#')
  ? rawBasePath
  : DEFAULT_NAS_BASE_PATH;
const NAS_BASE_PATH = normalizeBasePath(resolvedBasePath);

function normalizeNasPath(inputPath) {
  if (!inputPath) return inputPath;

  const basePath = NAS_BASE_PATH.replace(/\/+$/g, "");
  const baseName = basePath.split("/").pop();

  let normalized = String(inputPath)
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");

  if (!normalized) return normalized;

  if (normalized.startsWith(basePath)) {
    return normalized;
  }

  if (baseName && normalized.startsWith(`${baseName}/`)) {
    return `${basePath}/${normalized.slice(baseName.length + 1)}`;
  }

  if (!normalized.startsWith("/") && !normalized.includes("/")) {
    return `${basePath}/${normalized}`;
  }

  return normalized;
}

/**
 * 프로젝트 폴더 생성 (Synology API 사용)
 */
async function createProjectFolder({ name, startDate, pm, designers = [] }) {
  try {
    const projectData = {
      name,
      startDate,
      pmName: pm?.name,
      designerNames: designers.map(d => d.name)
    };

    const folderName = generateFolderName(projectData);
    const fullPath = `${NAS_BASE_PATH}/${folderName}`;

    console.log(`🚀 [NAS API] 프로젝트 폴더 생성 시도`);
    console.log(`   기본경로: ${NAS_BASE_PATH}`);
    console.log(`   폴더이름: ${folderName}`);

    // 1. 폴더 이미 존재 확인
    const alreadyExists = await synoApi.exists(fullPath);
    if (alreadyExists) {
        return {
            success: false,
            error: '동일한 이름의 폴더가 이미 존재합니다',
            code: 'FOLDER_EXISTS',
            existingPath: fullPath,
        };
    }

    // 2. 메인 프로젝트 폴더 생성
    await synoApi.createFolder(NAS_BASE_PATH, folderName);
    console.log(`✅ 메인 폴더 생성 완료: ${fullPath}`);

    // 3. 하위 폴더 구조 생성 (재귀 호출)
    await createRecursive(fullPath, FOLDER_STRUCTURE);

    return {
      success: true,
      folderName,
      folderPath: fullPath,
      message: '폴더가 성공적으로 생성되었습니다 (Synology API)',
    };
  } catch (error) {
    console.error('❌ NAS 폴더 생성 실패:', error.message);
    throw error;
  }
}

/**
 * 재귀적으로 하위 폴더 생성
 */
async function createRecursive(parentPath, structure) {
  for (const item of structure) {
    const itemName = typeof item === 'string' ? item : item.name;

    try {
      await synoApi.createFolder(parentPath, itemName);
      console.log(`   └─ ${itemName}`);
      
      if (typeof item === 'object' && item.children && item.children.length > 0) {
        await createRecursive(`${parentPath}/${itemName}`, item.children);
      }
    } catch (error) {
      console.warn(`⚠️ 하위 폴더 생성 실패 (계속 진행): ${itemName}`, error.message);
    }
  }
}

/**
 * 폴더 존재 확인
 */
async function checkFolderExists(folderName) {
  const fullPath = `${NAS_BASE_PATH}/${folderName}`;
  return await synoApi.exists(fullPath);
}

/**
 * 프로젝트 완료 처리 (NAS 폴더명 업데이트: xxxxxx -> YYMMDD)
 */
async function completeProjectFolder(projectId, currentPath) {
    try {
        const normalizedPath = normalizeNasPath(currentPath);
        console.log(`[NAS] 프로젝트 완료 처리 시작: ${normalizedPath}`);
        if (normalizedPath !== currentPath) {
            console.log(`[NAS] 경로 정규화: ${currentPath} -> ${normalizedPath}`);
        }
        
        const pathParts = normalizedPath.split('/');
        const oldName = pathParts.pop();
        const parentPath = pathParts.join('/');
        
        const { standardizeDate } = require('../utils/folderNameParser');
        const today = standardizeDate(new Date());
        
        // xxxxxx 부분을 오늘 날짜로 변경
        const newName = oldName.replace('-xxxxxx_', `-${today}_`);
        
        if (oldName === newName) {
            console.log('[NAS] 이미 완료된 폴더명이거나 형식이 다릅니다.');
            return { success: true, folderPath: currentPath };
        }

        const result = await synoApi.renameFolder(normalizedPath, newName);
        
        if (result.success) {
            const newPath = `${parentPath}/${newName}`;
            console.log(`[NAS] 폴더명 변경 성공: ${newPath}`);
            return { success: true, folderPath: newPath };
        }
        
        return { success: false, error: 'Rename API 실패' };
    } catch (error) {
        console.error('[NAS] 완료 처리 에러:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 프로젝트 정보 변경 시 NAS 폴더명 업데이트
 */
async function renameProjectFolder(projectId, currentPath, projectData = {}, lastUpdated) {
    try {
        const normalizedPath = normalizeNasPath(currentPath);
        if (!normalizedPath) {
            return { success: false, error: 'NAS 폴더 경로가 필요합니다.' };
        }

        let sourceData = projectData;
        let sourceLastUpdated = lastUpdated;
        let dbProject = null;

        if (projectId && supabase.getProjectById) {
            dbProject = await supabase.getProjectById(projectId);
            if (dbProject?.last_updated) {
                const dbTime = new Date(dbProject.last_updated).getTime();
                const payloadTime = lastUpdated ? new Date(lastUpdated).getTime() : NaN;
                if (isNaN(payloadTime) || (!isNaN(dbTime) && dbTime > payloadTime)) {
                    sourceData = {
                        name: dbProject.name,
                        startDate: dbProject.start_date,
                        endDate: dbProject.end_date,
                        pmName: dbProject.pm_name,
                        designerNames: [
                            dbProject.designer_name,
                            dbProject.designer_2_name,
                            dbProject.designer_3_name
                        ].filter(Boolean)
                    };
                    sourceLastUpdated = dbProject.last_updated;
                    console.log('[NAS] 최신 정보가 DB에 있어 DB 데이터를 기준으로 처리');
                }
            }
        }

        const pmName = sourceData.pmName || sourceData.pm_name;
        const designerNames = sourceData.designerNames || [
            sourceData.designer_name,
            sourceData.designer_2_name,
            sourceData.designer_3_name
        ].filter(Boolean);

        const folderName = generateFolderName({
            name: sourceData.name,
            startDate: sourceData.startDate || sourceData.start_date,
            endDate: sourceData.endDate || sourceData.end_date,
            pmName,
            designerNames
        });

        const pathParts = normalizedPath.split('/');
        const oldName = pathParts.pop();
        const parentPath = pathParts.join('/');

        if (!oldName) {
            return { success: false, error: '현재 폴더명을 찾을 수 없습니다.' };
        }

        if (oldName === folderName) {
            if (projectId && supabase.updateProjectNASInfo) {
                await supabase.updateProjectNASInfo(projectId, {
                    name: sourceData.name,
                    start_date: sourceData.startDate || sourceData.start_date,
                    end_date: sourceData.endDate || sourceData.end_date,
                    pm_name: pmName || null,
                    designer_name: designerNames[0] || null,
                    designer_2_name: designerNames[1] || null,
                    designer_3_name: designerNames[2] || null,
                    nas_folder_path: normalizedPath,
                    last_updated: sourceLastUpdated
                });
            }
            return { success: true, skipped: true, folderPath: normalizedPath };
        }

        const result = await synoApi.renameFolder(normalizedPath, folderName);
        if (result.success) {
            const newPath = `${parentPath}/${folderName}`;
            if (projectId && supabase.updateProjectNASInfo) {
                await supabase.updateProjectNASInfo(projectId, {
                    name: sourceData.name,
                    start_date: sourceData.startDate || sourceData.start_date,
                    end_date: sourceData.endDate || sourceData.end_date,
                    pm_name: pmName || null,
                    designer_name: designerNames[0] || null,
                    designer_2_name: designerNames[1] || null,
                    designer_3_name: designerNames[2] || null,
                    nas_folder_path: newPath,
                    last_updated: sourceLastUpdated
                });
            }
            console.log(`[NAS] 폴더명 변경 성공: ${newPath}`);
            return { success: true, folderPath: newPath };
        }

        return { success: false, error: 'Rename API 실패' };
    } catch (error) {
        console.error('[NAS] 이름 변경 에러:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
  createProjectFolder,
  checkFolderExists,
  completeProjectFolder,
  renameProjectFolder,
  NAS_BASE_PATH
};
