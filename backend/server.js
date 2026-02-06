const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const folderRoutes = require("./routes/folderRoutes");
const { startSyncService } = require("./services/syncService");
const { startWatcher } = require("./services/folderWatcher");

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
// app.use(helmet({
//   crossOriginResourcePolicy: false,
// }));
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json());

// 모든 요청 로그 출력
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === "POST")
    console.log("Payload:", JSON.stringify(req.body, null, 2));
  next();
});

app.use(morgan("dev"));

// 라우트 설정
app.use("/api/folder", folderRoutes);

/**
 * Health check 엔드포인트
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    nasApiUrl: process.env.NAS_URL,
    timestamp: new Date().toISOString(),
    version: "2.0.0 (Synology Web API)",
  });
});

/**
 * 404 핸들러
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "요청한 엔드포인트를 찾을 수 없습니다",
    code: "NOT_FOUND",
  });
});

/**
 * 에러 핸들러
 */
app.use((err, req, res, next) => {
  console.error("[SERVER ERROR]", err);
  res.status(500).json({
    success: false,
    error: "서버 내부 오류가 발생했습니다",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 서버 및 동기화 서비스 시작
app.listen(PORT, () => {
  console.log("==========================================");
  console.log("🚀 Grafy NAS 백엔드 서버 시작 (v2.0)");
  console.log(`🌐 서버 주소: http://localhost:${PORT}`);
  console.log(`🔗 NAS API 주소: ${process.env.NAS_URL}`);
  console.log(`📁 NAS 기준 경로: ${process.env.NAS_BASE_PATH}`);
  console.log("==========================================");

  // 백그라운드 동기화 서비스 시작 (3초 주기)
  startSyncService(3000);
  startWatcher();
});
