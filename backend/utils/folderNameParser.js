/**
 * 폴더명 생성 및 파싱 유틸리티
 */

const FORBIDDEN_CHARS = /[<>:"\/\\|?*]/g;
const FOLDER_NAME_PATTERN = /^(\d{6})-([a-zA-Z0-9x]+)_(.+?)_(.+?)_(.*)$/;

/**
 * 날짜 문자열을 YYMMDD 형식으로 변환 (우선순위 개선)
 */
function standardizeDate(dateInput) {
  if (!dateInput) return "";
  
  // 1. 숫자로만 된 6자리(YYMMDD)인 경우 가장 먼저 처리
  const cleaned = String(dateInput).replace(/\D/g, "");
  if (cleaned.length === 6) {
    return cleaned;
  }
  
  // 2. 숫자로만 된 8자리(YYYYMMDD)인 경우
  if (cleaned.length === 8) {
    return cleaned.slice(2);
  }

  // 3. 표준 날짜 형식(2026-01-31 등) 처리
  let date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }

  return "";
}

function stripTitleAndSurname(rawName) {
  if (!rawName) return "";

  const trimmed = String(rawName).trim();
  if (!trimmed) return "";

  const titles = [
    "대표",
    "이사",
    "부장",
    "차장",
    "과장",
    "대리",
    "주임",
    "사원",
    "팀장",
    "실장",
    "본부장",
    "디렉터",
    "매니저",
    "리드",
    "수석",
    "책임",
    "선임",
    "파트장",
    "PM",
    "PD"
  ];

  const titlePattern = new RegExp(`\\s*(?:${titles.join("|")})$`, "i");
  let normalized = trimmed;
  while (titlePattern.test(normalized)) {
    normalized = normalized.replace(titlePattern, "").trim();
  }

  if (!normalized) return "";

  if (/[가-힣]/.test(normalized)) {
    return normalized.replace(/\s+/g, "");
  }

  return normalized.split(/\s+/)[0] || "";
}

function generateFolderName(projectData) {
  const { name, startDate, endDate = "xxxxxx", pmName, designerNames = [] } = projectData;

  // 날짜가 없으면 000000 대신 오늘 날짜라도 넣어서 빈 값이 안 나오게 함
  const formattedStartDate = standardizeDate(startDate) || standardizeDate(new Date());
  const formattedEndDate = endDate === "xxxxxx"
    ? "xxxxxx"
    : standardizeDate(endDate) || "xxxxxx";

  let client = "미지정";
  let projectName = name;

  if (name.includes("/")) {
    const parts = name.split("/").map(s => s.trim());
    if (parts.length >= 2) {
      client = sanitizeFolderName(parts[0]);
      projectName = sanitizeFolderName(parts[1]);
    }
  } else {
    projectName = sanitizeFolderName(name);
  }

  const responsiblePeople = [];
  if (pmName) responsiblePeople.push(pmName);
  responsiblePeople.push(...designerNames.filter(Boolean));

  const sanitizedResponsible = responsiblePeople
    .map(name => sanitizeFolderName(stripTitleAndSurname(name)))
    .filter(Boolean)
    .join(",");

  return `${formattedStartDate}-${formattedEndDate}_${client}_${projectName}_${sanitizedResponsible}`;
}

function parseFolderName(folderName) {
  const match = folderName.match(FOLDER_NAME_PATTERN);
  if (!match) return null;

  const [, startDate, endDate, client, projectName, responsible] = match;
  const isOngoing = endDate === "xxxxxx";

  return {
    startDate: formatDate(startDate),
    endDate: isOngoing ? null : formatDate(endDate),
    client,
    projectName,
    responsible: responsible ? responsible.split(",") : []
  };
}

function formatDate(yyMMdd) {
  if (yyMMdd.length !== 6) return null;
  const yy = parseInt(yyMMdd.substring(0, 2));
  const mm = parseInt(yyMMdd.substring(2, 4));
  const dd = parseInt(yyMMdd.substring(4, 6));
  return `${String(yy).padStart(2, '0')}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function sanitizeFolderName(name) {
  if (!name) return "";
  return name
    .replace(FORBIDDEN_CHARS, "-")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  generateFolderName,
  parseFolderName,
  sanitizeFolderName,
  standardizeDate
};
