const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const NAS_URL = process.env.NAS_URL || 'https://grafymm.synology.me:5001';
const USERNAME = process.env.NAS_USERNAME;
const PASSWORD = process.env.NAS_PASSWORD;

let sid = null;
let sidExpiry = 0;

/**
 * 로그인하여 SID 획득
 */
async function login() {
  if (!USERNAME || !PASSWORD) {
    throw new Error('NAS_USERNAME/NAS_PASSWORD 환경변수가 설정되어야 합니다.');
  }
  console.log(`[NAS API] 로그인 시도: ${USERNAME}@${NAS_URL}`);
  
  const response = await axios.get(`${NAS_URL}/webapi/entry.cgi`, {
    params: {
      api: 'SYNO.API.Auth',
      version: 3,
      method: 'login',
      account: USERNAME,
      passwd: PASSWORD,
      session: 'FileStation',
      format: 'sid'
    },
    timeout: 30000
  });
  
  if (!response.data.success) {
    throw new Error(`로그인 실패: ${JSON.stringify(response.data.error)}`);
  }
  
  sid = response.data.data.sid;
  sidExpiry = Date.now() + 1000 * 60 * 10; // 10분 후 만료
  console.log('✅ Synology NAS 로그인 성공');
  return sid;
}

/**
 * 유효한 SID 보장
 */
async function ensureSid() {
  if (!sid || Date.now() > sidExpiry) {
    await login();
  }
  return sid;
}

/**
 * Synology API 호출 기본 함수
 */
async function callApi(api, version, method, params = {}) {
  const currentSid = await ensureSid();
  
  console.log(`[NAS API] ${api}.${method}`);
  
  const response = await axios.get(`${NAS_URL}/webapi/entry.cgi`, {
    params: {
      api,
      version: version.toString(),
      method,
      ...params,
      _sid: currentSid
    },
    timeout: 30000
  });

  if (response.data.success) {
    return response.data;
  } else {
    // 세션 만료 시 재시도
    if (response.data.error?.code === 105 || response.data.error?.code === 106 || response.data.error?.code === 119) {
      console.log('[NAS API] 세션 만료, 재로그인...');
      sid = null;
      const newSid = await ensureSid();
      
      const retryResponse = await axios.get(`${NAS_URL}/webapi/entry.cgi`, {
        params: {
          api,
          version: version.toString(),
          method,
          ...params,
          _sid: newSid
        },
        timeout: 30000
      });
      
      if (retryResponse.data.success) {
        return retryResponse.data;
      }
      throw new Error(`Synology API Error (재시도 후): ${JSON.stringify(retryResponse.data.error)}`);
    }
    
    throw new Error(`Synology API Error: ${JSON.stringify(response.data.error)}`);
  }
}

/**
 * 폴더 생성
 */
async function createFolder(folderPath, name) {
  console.log(`[NAS API] 폴더 생성: ${folderPath}/${name}`);
  
  return callApi('SYNO.FileStation.CreateFolder', 2, 'create', {
    folder_path: JSON.stringify([folderPath]),
    name: JSON.stringify([name]),
    force_parent: 'true'
  });
}

/**
 * 폴더 목록 조회
 */
async function listFolders(path) {
  const result = await callApi('SYNO.FileStation.List', 2, 'list', {
    folder_path: path,
    filetype: 'dir'
  });
  return result.data?.files || [];
}

/**
 * 경로 존재 여부 확인
 */
async function exists(path) {
  try {
    await callApi('SYNO.FileStation.List', 2, 'list', {
      folder_path: path,
      limit: 1
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 폴더 이름 변경
 */
async function renameFolder(path, newName) {
  console.log(`[NAS API] 폴더 이름 변경: ${path} -> ${newName}`);
  
  return callApi('SYNO.FileStation.Rename', 2, 'rename', {
    path: JSON.stringify([path]),
    name: JSON.stringify([newName])
  });
}

/**
 * 폴더 삭제
 */
async function deleteFolder(path) {
  console.log(`[NAS API] 폴더 삭제: ${path}`);

  return callApi('SYNO.FileStation.Delete', 2, 'delete', {
    path: JSON.stringify([path]),
    recursive: 'true'
  });
}

module.exports = {
  createFolder,
  listFolders,
  exists,
  renameFolder,
  deleteFolder
};
