const fs = require('fs').promises;
const path = require('path');
const FOLDER_STRUCTURE = require('../config/folderStructure');

const NAS_BASE_PATH = process.env.NAS_BASE_PATH || '';

/**
 * 프로젝트 폴더 생성
 */
async function createProjectFolder({ name, startDate, pm, designers = [] }) {
  const folderName = generateFolderName({ name, startDate, pm, designers });
  const fullPath = path.join(NAS_BASE_PATH, folderName);

  // 폴더 이미 존재 확인
  try {
    await fs.access(fullPath);
    return {
      success: false,
      error: '동일한 이름의 폴더가 이미 존재합니다',
      code: 'FOLDER_EXISTS',
      existingPath: fullPath,
    };
  } catch (err) {
    // 폴더 없음, 계속 진행
  }

  // 메인 폴더 생성
  await fs.mkdir(fullPath, { recursive: true });
  console.log(`✅ 메인 폴더 생성: ${fullPath}`);

  const createdFolders = [];

  // 하위 폴더 생성
  for (const folder of FOLDER_STRUCTURE) {
    const folderPath = path.join(fullPath, folder.name);
    await fs.mkdir(folderPath, { recursive: true });
    createdFolders.push(folder.name);
    console.log(`  ├─ ${folder.name}`);

    for (const child of folder.children || []) {
      const childPath = path.join(folderPath, child);
      await fs.mkdir(childPath, { recursive: true });
      createdFolders.push(`${folder.name}/${child}`);
      console.log(`  │  └─ ${child}`);
    }
  }

  return {
    success: true,
    folderName,
    folderPath: fullPath,
    message: '폴더가 성공적으로 생성되었습니다',
    createdFolders,
  };
}

/**
 * 폴더명 생성
 */
function generateFolderName({ name, startDate, pm, designers }) {
  // 날짜 변환
  const start = formatDate(startDate);
  const end = 'xxxxxx';

  // 프로젝트명 파싱
  const [client, projectName] = parseProjectName(name);

  // 담당자 조합
  const members = [pm?.name, ...designers.map(d => d.name)]
    .filter(Boolean)
    .join(',');

  const folderName = `${start}-${end}_${client}_${projectName}_${members}`;

  return sanitizeFolderName(folderName);
}

/**
 * 날짜 포맷 (YYYY-MM-DD → YYMMDD)
 */
function formatDate(dateStr) {
  if (!dateStr) return 'xxxxxx';

  const date = new Date(dateStr);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yy}${mm}${dd}`;
}

/**
 * 프로젝트명 파싱 (클라이언트 / 프로젝트명)
 */
function parseProjectName(name) {
  const parts = name.split('/').map(s => s.trim());

  if (parts.length >= 2) {
    return [parts[0], parts.slice(1).join('_')];
  }

  return ['미지정', name];
}

/**
 * 특수문자 제거 및 정리
 */
function sanitizeFolderName(name) {
  return name
    .replace(/[<>:"\/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

/**
 * 폴더 존재 확인
 */
async function checkFolderExists(folderName) {
  const fullPath = path.join(NAS_BASE_PATH, folderName);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  createProjectFolder,
  checkFolderExists,
  generateFolderName,
};
