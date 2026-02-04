const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your-supabase-url' && supabaseKey !== 'your-service-key') {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase 연결 성공');
  } catch (error) {
    console.warn('⚠️  Supabase 연결 실패:', error.message);
    console.log('ℹ️  폴더 감시 기능만 활성화됩니다.');
  }
} else {
  console.warn('⚠️  Supabase 환경변수가 설정되지 않았습니다.');
  console.log('ℹ️  폴더 감시 기능만 활성화됩니다.');
}

const NAS_PROJECT_PATH = process.env.NAS_BASE_PATH || '\\\\192.168.2.2\\grafy\\#Project\\# 2026 GRAFY. 프로젝트';
const pendingRenames = new Map();

function startWatcher() {
  if (!supabase) {
    console.log('⚠️  Supabase 연결 없음, 폴더 감시 서비스를 시작하지 않습니다.');
    return null;
  }

  console.log(`🔄 폴더 감시 서비스 시작: ${NAS_PROJECT_PATH}`);

  const watcher = chokidar.watch(NAS_PROJECT_PATH, {
    ignored: /[\/\\]\./,
    persistent: true,
    depth: 0,
    usePolling: true,
    interval: 3000,
    binaryInterval: 5000,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher.on('addDir', async (dirPath) => {
    if (path.dirname(dirPath) !== NAS_PROJECT_PATH) return;

    const folderName = path.basename(dirPath);

    if (!isValidProjectFolder(folderName)) return;

    const recentDelete = checkForRename(folderName);
    if (recentDelete) {
      await handleFolderRenamed(recentDelete, dirPath);
    } else {
      await handleFolderAdded(dirPath);
    }
  });

  watcher.on('unlinkDir', async (dirPath) => {
    if (path.dirname(dirPath) !== NAS_PROJECT_PATH) return;

    const folderName = path.basename(dirPath);

    if (!isValidProjectFolder(folderName)) return;

    pendingRenames.set(folderName, Date.now());

    setTimeout(() => {
      if (pendingRenames.has(folderName)) {
        pendingRenames.delete(folderName);
        console.log(`📁 폴더 삭제 감지 (로그만): ${dirPath}`);
      }
    }, 500);
  });

  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;

  watcher.on('error', async (error) => {
    console.error('❌ 폴더 감시 에러:', error);

    if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'ENOTCONN') {
      console.log('네트워크 연결 끊김 감지, 재연결 시도...');

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = 5000 * reconnectAttempts;
        console.log(`${delay}ms 후 재연결 시도 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
          const { testNASConnection } = require('../server');
          const reconnected = await testNASConnection();

          if (reconnected) {
            reconnectAttempts = 0;
            console.log('✅ 재연결 성공');
          } else {
            console.error('❌ 재연결 실패');
          }
        } catch (err) {
          console.error('❌ 재연결 중 에러:', err);
        }
      } else {
        console.error('❌ 최대 재연결 시도 도달, 재연결 중단');
      }
    }
  });

  console.log('✅ 폴더 감시 서비스가 시작되었습니다.');
  return watcher;
}

function checkForRename(folderName) {
  const now = Date.now();
  for (const [name, timestamp] of pendingRenames.entries()) {
    if (now - timestamp < 500) {
      pendingRenames.delete(name);
      return { oldName: name, timestamp };
    }
  }
  return null;
}

async function handleFolderAdded(folderPath) {
  const folderName = path.basename(folderPath);
  console.log(`📁 새 폴더 감지: ${folderName}`);

  const parseFolderName = require('./folderService').parseFolderName;

  try {
    const parsed = parseFolderName(folderName);
    const projectName = `${parsed.client} / ${parsed.projectName}`;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('name', projectName)
      .limit(1);

    if (error) {
      console.error('Supabase 조회 에러:', error);
      return;
    }

    if (data && data.length > 0) {
      const project = data[0];
      if (!project.nas_folder_path) {
        await supabase
          .from('projects')
          .update({
            nas_folder_path: folderPath,
            nas_folder_created: true,
            nas_last_synced: new Date().toISOString(),
          })
          .eq('id', project.id);

        console.log(`✅ 프로젝트에 NAS 경로 연결: ${project.name}`);
      }
    } else {
      console.log(`ℹ️  새 폴더에 해당하는 프로젝트가 없습니다: ${folderName}`);
    }
  } catch (error) {
    console.error('폴더 추가 처리 에러:', error);
  }
}

async function handleFolderRenamed(renameData, newPath) {
  const { oldName } = renameData;
  const newName = path.basename(newPath);
  const oldPath = path.join(path.dirname(newPath), oldName);

  console.log(`📁 폴더명 변경 감지: ${oldName} → ${newName}`);

  const parseFolderName = require('./folderService').parseFolderName;
  const parseDate = require('./folderService').parseDate;

  try {
    const parsed = parseFolderName(newName);
    const projectName = `${parsed.client} / ${parsed.projectName}`;
    const startDate = parseDate(parsed.startDate);
    const endDate = parsed.endDate !== 'xxxxxx' ? parseDate(parsed.endDate) : null;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('nas_folder_path', oldPath)
      .limit(1);

    if (error) {
      console.error('Supabase 조회 에러:', error);
      return;
    }

    if (data && data.length > 0) {
      const project = data[0];

      await supabase
        .from('projects')
        .update({
          name: projectName,
          start_date: startDate,
          end_date: endDate,
          nas_folder_path: newPath,
          nas_last_synced: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        })
        .eq('id', project.id);

      console.log(`✅ 프로젝트 동기화 완료: ${project.name} → ${projectName}`);
    } else {
      console.log(`ℹ️  변경된 폴더에 해당하는 프로젝트를 찾을 수 없습니다: ${oldName}`);
    }
  } catch (error) {
    console.error('폴더명 변경 처리 에러:', error);
  }
}

function isValidProjectFolder(folderName) {
  const pattern = /^\d{6}-(?:\d{6}|xxxxxx)_/;
  return pattern.test(folderName);
}

module.exports = {
  startWatcher,
};
