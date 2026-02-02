const express = require('express');
const router = express.Router();
const folderService = require('../services/folderService');

/**
 * POST /folder/create
 * 프로젝트 폴더 생성
 */
router.post('/create', async (req, res) => {
  try {
    const { name, startDate, pm, pmName, designers, designerNames } = req.body;

    console.log('[API] 폴더 생성 요청:', { name, startDate, pmName: pmName || pm?.name });

    // 입력 검증
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '프로젝트명이 필요합니다',
        code: 'MISSING_NAME',
      });
    }

    if (name.length > 200) {
      return res.status(400).json({
        success: false,
        error: '프로젝트명이 너무 깁니다 (최대 200자)',
        code: 'NAME_TOO_LONG',
      });
    }

    // 프론트엔드 형식(pmName, designerNames) → 백엔드 형식(pm, designers) 변환
    const pmObject = pm || (pmName ? { name: pmName } : null);
    let designerObjects = designers || [];
    
    if (designerNames && designerNames.length > 0) {
      designerObjects = designerNames.map(name => ({ name }));
    }

    // 폴더 생성
    const result = await folderService.createProjectFolder({
      name,
      startDate,
      pm: pmObject,
      designers: designerObjects,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(409).json(result);
    }
  } catch (error) {
    console.error('[API] 폴더 생성 에러:', error);
    res.status(500).json({
      success: false,
      error: error.message || '폴더 생성 중 오류가 발생했습니다',
      code: 'CREATE_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * GET /folder/exists/:folderName
 * 폴더 존재 여부 확인
 */
router.get('/exists/:folderName', async (req, res) => {
  try {
    const { folderName } = req.params;
    const exists = await folderService.checkFolderExists(folderName);
    
    res.json({ exists });
  } catch (error) {
    console.error('폴더 확인 에러:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /folder/complete
 * 프로젝트 완료 시 NAS 폴더명 업데이트 (xxxxxx -> 오늘날짜)
 */
router.post('/complete', async (req, res) => {
  try {
    const { projectId, nasFolderPath } = req.body;
    
    if (!nasFolderPath) {
      return res.status(400).json({ success: false, error: 'NAS 폴더 경로가 필요합니다.' });
    }

    const result = await folderService.completeProjectFolder(projectId, nasFolderPath);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[API] 완료 처리 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /folder/rename
 * 프로젝트 정보 변경 시 NAS 폴더명 업데이트
 */
router.post('/rename', async (req, res) => {
  try {
    const { projectId, nasFolderPath, projectData, lastUpdated } = req.body;

    if (!nasFolderPath) {
      return res.status(400).json({ success: false, error: 'NAS 폴더 경로가 필요합니다.' });
    }

    if (!projectData?.name) {
      return res.status(400).json({ success: false, error: '프로젝트 정보가 필요합니다.' });
    }

    const result = await folderService.renameProjectFolder(
      projectId,
      nasFolderPath,
      projectData,
      lastUpdated
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[API] 이름 변경 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
