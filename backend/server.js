const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

const folderRoutes = require('./routes/folderRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: false,
}));
app.use(express.json());
app.use(morgan('combined'));

// 라우트
app.use('/api/folder', folderRoutes);

/**
 * Health check 엔드포인트
 */
app.get('/api/health', (req, res) => {
  const nasPath = process.env.NAS_BASE_PATH || '';
  const nasConnected = fs.existsSync(nasPath);
  
  res.json({
    status: 'ok',
    nasConnected,
    nasPath: nasConnected ? nasPath : `경로를 찾을 수 없습니다: ${nasPath}`,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * 404 핸들러
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '요청한 엔드포인트를 찾을 수 없습니다',
    code: 'NOT_FOUND',
  });
});

/**
 * 에러 핸들러
 */
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: '서버 내부 오류가 발생했습니다',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('✅ NAS 백엔드 서버 시작');
  console.log(`🌐 서버 주소: http://localhost:${PORT}`);
  console.log(`📁 NAS 경로: ${process.env.NAS_BASE_PATH || '(미설정)'}`);
  console.log(`🔧 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log('==========================================');
  
  // NAS 연결 확인
  if (process.env.NAS_BASE_PATH && !fs.existsSync(process.env.NAS_BASE_PATH)) {
    console.warn('⚠️  경고: NAS 경로에 접근할 수 없습니다.');
    console.warn(`   경로: ${process.env.NAS_BASE_PATH}`);
    console.warn('   .env 파일의 NAS_BASE_PATH를 확인해주세요.');
  }
});
