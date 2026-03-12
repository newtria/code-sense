/**
 * 커서 기반 페이지네이션 vs OFFSET 페이지네이션 비교
 * 실행: node cursor-pagination.js
 *
 * Node.js 22+: 내장 node:sqlite 사용
 * Node.js 22 미만: npm install better-sqlite3 후 실행
 *
 * OFFSET 방식의 문제점을 보여주고, 커서 기반 방식이 왜 빠른지 시연한다.
 */

const { loadSQLite } = require("./sqlite-loader");
const Database = loadSQLite();

const db = new Database(":memory:");

// ============================================
// 1. 테이블 생성 + 대량 데이터 삽입
// ============================================
console.log("=== 커서 기반 페이지네이션 vs OFFSET 비교 ===\n");

db.exec(`
  CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const TOTAL_ROWS = 200000;
console.log(`${TOTAL_ROWS.toLocaleString()}건 데이터 삽입 중...`);

const insert = db.prepare(
  "INSERT INTO articles (title, author, created_at) VALUES (?, ?, ?)"
);
const authors = ["홍길동", "김영희", "이철수", "박지민", "최유리"];

db.exec("BEGIN");
for (let i = 0; i < TOTAL_ROWS; i++) {
  // 날짜를 순차적으로 생성 (정렬 가능하도록)
  const date = new Date(2020, 0, 1);
  date.setMinutes(date.getMinutes() + i);
  insert.run(
    `게시글 ${i + 1}`,
    authors[i % authors.length],
    date.toISOString()
  );
}
db.exec("COMMIT");
console.log("삽입 완료\n");

// 인덱스 생성 (created_at 기준 정렬/검색 최적화)
db.exec("CREATE INDEX idx_articles_created ON articles(created_at)");

// ============================================
// 2. OFFSET 페이지네이션 (잘못된 방식)
// ============================================
console.log("=== 1. OFFSET 페이지네이션 (잘못된 방식) ===\n");
console.log("  SQL: SELECT * FROM articles ORDER BY id LIMIT 20 OFFSET ?");
console.log("");

const PAGE_SIZE = 20;
const offsets = [0, 1000, 10000, 50000, 100000, 190000];

console.log("  OFFSET 값에 따른 속도 변화:");
console.log("  ─────────────────────────────────────────");

const offsetStmt = db.prepare(
  "SELECT * FROM articles ORDER BY id LIMIT ? OFFSET ?"
);

for (const offset of offsets) {
  const start = performance.now();
  // 여러 번 실행하여 안정적인 측정 (SQLite 인메모리는 너무 빨라서)
  for (let run = 0; run < 100; run++) {
    offsetStmt.all(PAGE_SIZE, offset);
  }
  const elapsed = ((performance.now() - start) / 100).toFixed(3);
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const bar = "█".repeat(Math.min(Math.ceil(parseFloat(elapsed) * 20), 40));
  console.log(
    `  OFFSET ${String(offset).padStart(6)} (${String(page).padStart(5)}페이지): ${elapsed}ms ${bar}`
  );
}

console.log("");
console.log("  [문제] OFFSET이 클수록 느려진다!");
console.log("  이유: DB가 OFFSET 개의 행을 먼저 읽고 건너뛴 뒤 LIMIT 개를 반환한다.");
console.log("  OFFSET 190000 = 19만 행을 읽고 버린 뒤 20개만 반환. 낭비가 심하다.");
console.log("  -> 데이터가 많은 서비스에서 '마지막 페이지'로 갈수록 체감 속도가 떨어진다.");
console.log("");

// ============================================
// 3. 커서 기반 페이지네이션 (올바른 방식)
// ============================================
console.log("=== 2. 커서 기반 페이지네이션 (올바른 방식) ===\n");
console.log("  SQL: SELECT * FROM articles WHERE id > ? ORDER BY id LIMIT ?");
console.log("  (마지막으로 받은 id를 커서로 사용)");
console.log("");

// 같은 위치의 데이터를 가져오되, 커서 방식으로
const cursorStmt = db.prepare(
  "SELECT * FROM articles WHERE id > ? ORDER BY id LIMIT ?"
);

console.log("  커서 위치(=마지막 id)에 따른 속도:");
console.log("  ─────────────────────────────────────────");

for (const cursor of offsets) {
  const start = performance.now();
  for (let run = 0; run < 100; run++) {
    cursorStmt.all(cursor, PAGE_SIZE);
  }
  const elapsed = ((performance.now() - start) / 100).toFixed(3);
  const bar = "█".repeat(Math.min(Math.ceil(parseFloat(elapsed) * 20), 40));
  console.log(
    `  커서 id > ${String(cursor).padStart(6)}: ${elapsed}ms ${bar}`
  );
}

console.log("");
console.log("  [성공] 커서 위치와 상관없이 속도가 일정하다!");
console.log("  이유: WHERE id > cursor 는 B-Tree 인덱스를 사용하여");
console.log("        해당 위치로 바로 점프한 뒤 LIMIT 개만 읽는다.");
console.log("        건너뛰기(skip)가 없으므로 항상 O(log N + LIMIT).");
console.log("");

// ============================================
// 4. 실제 구현 예시 — 페이지 순회
// ============================================
console.log("=== 3. 커서 기반 페이지 순회 예시 ===\n");

let lastId = 0;
const pageLimit = 5;
const maxPages = 3;

console.log(`  처음 ${maxPages}페이지를 순회 (페이지당 ${pageLimit}건):\n`);

for (let page = 1; page <= maxPages; page++) {
  const rows = cursorStmt.all(lastId, pageLimit);

  console.log(`  --- ${page}페이지 (커서: id > ${lastId}) ---`);
  for (const row of rows) {
    console.log(`    id=${row.id}  ${row.title}  ${row.author}`);
  }

  if (rows.length === 0) break;
  lastId = rows[rows.length - 1].id; // 다음 커서 = 마지막 행의 id
  console.log(`  -> 다음 요청의 커서: id > ${lastId}`);
  console.log("");
}

// ============================================
// 5. API 응답 형태 예시
// ============================================
console.log("=== 4. API 응답 형태 ===\n");

const exampleRows = cursorStmt.all(0, 3);
const nextCursor = exampleRows.length > 0
  ? exampleRows[exampleRows.length - 1].id
  : null;

const apiResponse = {
  data: exampleRows,
  pagination: {
    next_cursor: nextCursor,
    has_more: exampleRows.length === 3,
    limit: 3,
  },
};

console.log("  클라이언트에게 보내는 응답 예시:");
console.log("  " + JSON.stringify(apiResponse, null, 2).split("\n").join("\n  "));
console.log("");
console.log("  클라이언트는 pagination.next_cursor를 다음 요청에 사용:");
console.log(`  GET /api/articles?cursor=${nextCursor}&limit=3`);
console.log("");

// ============================================
// 핵심 정리
// ============================================
console.log("=== 핵심 정리 ===\n");
console.log("                    OFFSET             커서(Cursor)");
console.log("  ───────────────  ──────────────────  ──────────────────");
console.log("  속도              뒤로 갈수록 느림    항상 일정");
console.log("  구현 난이도       쉬움 (페이지 번호)  약간 복잡");
console.log("  특정 페이지 이동  가능 (3페이지 클릭)  불가 (순차 이동만)");
console.log("  데이터 변경 시    중복/누락 발생 가능  안전");
console.log("  사용 사례         관리자 페이지        무한 스크롤, API");
console.log("");
console.log("  언제 뭘 쓸까?");
console.log('    - 데이터가 적고 "3페이지로 이동" 필요 -> OFFSET');
console.log("    - 대량 데이터 + 무한스크롤/API        -> 커서");
console.log("    - 실시간 피드(새 글이 계속 추가)       -> 커서 필수");
console.log("");
console.log("  [주의]");
console.log("  - 커서 컬럼은 반드시 유니크 + 정렬 가능해야 한다 (보통 PK 또는 타임스탬프).");
console.log("  - 커서 값을 클라이언트에 노출할 때는 인코딩(Base64 등)을 고려하라.");
