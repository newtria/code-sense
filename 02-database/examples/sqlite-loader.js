/**
 * SQLite 로더 — 환경에 따라 적절한 SQLite 모듈을 반환.
 *
 * Node.js 22+: 내장 node:sqlite (experimental)
 * 그 외:       better-sqlite3 (npm install better-sqlite3)
 */

function loadSQLite() {
  // 1. Node.js 22+ 내장 SQLite
  try {
    const sqlite = require("node:sqlite");
    return sqlite.DatabaseSync;
  } catch {
    // node:sqlite 없음
  }

  // 2. better-sqlite3 폴백
  try {
    return require("better-sqlite3");
  } catch {
    // better-sqlite3도 없음
  }

  console.error("SQLite를 로드할 수 없습니다.\n");
  console.error("해결 방법 (택 1):");
  console.error("  1. Node.js 22 이상 사용 (node -v로 확인)");
  console.error("  2. npm install better-sqlite3");
  process.exit(1);
}

module.exports = { loadSQLite };
