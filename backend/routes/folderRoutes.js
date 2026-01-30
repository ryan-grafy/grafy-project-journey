const express = require('express');
const router = express.Router();
const folderService = require('../services/folderService');

/**
 * POST /folder/create
 * 프로젝트 폴더 생성
 */
router.post('/create', async (req, res) => {
  try {
    const { name, startDate, pm, designers } = req.body;

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

    // 폴더 생성
    const result = await folderService.createProjectFolder({
      name,
      startDate,
      pm,
      designers: designers || [],
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(409).json(result);
    }
  } catch (error) {
    console.error('폴더 생성 에러:', error);
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

module.exports = router;
