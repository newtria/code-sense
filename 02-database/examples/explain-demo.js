/**
 * EXPLAIN QUERY PLAN 데모 — 인덱스 유무에 따른 실행 계획 차이
 * 실행: node explain-demo.js
 *
 * Node.js 22+: 내장 node:sqlite 사용
 * Node.js 22 미만: npm install better-sqlite3 후 실행
 *
 * [핵심] EXPLAIN QUERY PLAN은 쿼리가 "어떻게" 실행되는지 보여준다.
 * SCAN = 테이블 전체를 훑는다 (느림)
 * SEARCH = 인덱스를 사용해 바로 찾는다 (빠름)
 */

const { loadSQLite } = require("./sqlite-loader");
const Database = loadSQLite();

const db = new Database(":memory:");

// ============================================
// 1. 테이블 생성 + 대량 데이터 삽입
// ============================================
console.log("=== EXPLAIN QUERY PLAN 데모 ===\n");

db.exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log("10만 건 데이터 삽입 중...");
const insert = db.prepare(
  "INSERT INTO products (name, category, price) VALUES (?, ?, ?)"
);

const categories = ["전자기기", "의류", "식품", "도서", "가구"];

db.exec("BEGIN");
for (let i = 0; i < 100000; i++) {
  insert.run(
    `상품_${i}`,
    categories[i % categories.length],
    Math.floor(Math.random() * 100000) + 1000
  );
}
db.exec("COMMIT");
console.log("삽입 완료\n");

// ============================================
// 헬퍼: EXPLAIN QUERY PLAN 결과를 보기 좋게 출력
// ============================================
function showExplain(label, sql) {
  console.log(`  [${label}]`);
  console.log(`  SQL: ${sql}`);
  console.log("  실행 계획:");

  const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
  for (const row of rows) {
    const detail = row.detail;
    // SCAN vs SEARCH 강조
    let marker = "  ";
    if (detail.includes("SCAN")) {
      marker = "  !! (느림) ";
    } else if (detail.includes("SEARCH")) {
      marker = "  >> (빠름) ";
    }
    console.log(`  ${marker}${detail}`);
  }
  console.log("");
}

// ============================================
// 2. 인덱스 없이 — SCAN (잘못된 방식)
// ============================================
console.log("=== 1. 인덱스 없이 조회 (잘못된 방식) ===\n");

showExplain(
  "WHERE category 검색",
  "SELECT * FROM products WHERE category = '전자기기'"
);
console.log("  -> SCAN TABLE products: 10만 건을 처음부터 끝까지 전부 훑는다.");
console.log("  -> 데이터가 100만 건이면 100만 건을 다 본다. O(N) 선형 탐색.");
console.log("");

showExplain(
  "WHERE category + price 범위",
  "SELECT * FROM products WHERE category = '도서' AND price > 50000"
);
console.log("  -> 역시 SCAN. 두 조건이지만 인덱스가 없으므로 전체를 훑는다.");
console.log("");

// 실제 속도 측정 (인덱스 없이)
console.time("  인덱스 없이 검색");
db.prepare("SELECT * FROM products WHERE category = '전자기기' AND price > 50000").all();
console.timeEnd("  인덱스 없이 검색");
console.log("");

// ============================================
// 3. 인덱스 생성
// ============================================
console.log("=== 2. 인덱스 생성 ===\n");

console.log("  CREATE INDEX idx_products_category ON products(category);");
db.exec("CREATE INDEX idx_products_category ON products(category)");

console.log("  CREATE INDEX idx_products_category_price ON products(category, price);");
db.exec("CREATE INDEX idx_products_category_price ON products(category, price)");
console.log("");

console.log("  참고: 복합 인덱스(category, price)는 왼쪽부터 사용된다.");
console.log("    - WHERE category = ?                 -> 사용됨");
console.log("    - WHERE category = ? AND price > ?   -> 사용됨");
console.log("    - WHERE price > ?                    -> 사용 안 됨! (category가 먼저)");
console.log("");

// ============================================
// 4. 인덱스 있으면 — SEARCH (올바른 방식)
// ============================================
console.log("=== 3. 인덱스 있으면 조회 (올바른 방식) ===\n");

showExplain(
  "WHERE category 검색 (인덱스 있음)",
  "SELECT * FROM products WHERE category = '전자기기'"
);
console.log("  -> SEARCH TABLE ... USING INDEX: 인덱스를 사용해 바로 찾는다.");
console.log("  -> B-Tree 인덱스로 O(log N) 탐색. 10만 건이든 100만 건이든 빠르다.");
console.log("");

showExplain(
  "WHERE category + price (복합 인덱스 사용)",
  "SELECT * FROM products WHERE category = '도서' AND price > 50000"
);
console.log("  -> 복합 인덱스(category, price)를 사용하여 범위까지 효율적으로 검색.");
console.log("");

// 실제 속도 측정 (인덱스 있으면)
console.time("  인덱스 있으면 검색");
db.prepare("SELECT * FROM products WHERE category = '전자기기' AND price > 50000").all();
console.timeEnd("  인덱스 있으면 검색");
console.log("");

// ============================================
// 5. 인덱스가 사용되지 않는 경우
// ============================================
console.log("=== 4. 인덱스가 사용되지 않는 경우 (주의!) ===\n");

showExplain(
  "LIKE 와일드카드 앞",
  "SELECT * FROM products WHERE name LIKE '%상품_500%'"
);
console.log("  -> LIKE '%...' (앞에 %)는 인덱스를 사용할 수 없다.");
console.log("  -> 전체를 훑어야 하므로 SCAN이 된다.");
console.log("");

showExplain(
  "함수로 감싼 컬럼",
  "SELECT * FROM products WHERE LOWER(category) = '전자기기'"
);
console.log("  -> 컬럼에 함수를 적용하면 인덱스를 사용할 수 없다.");
console.log("  -> 해결: 함수 기반 인덱스 또는 데이터 정규화.");
console.log("");

showExplain(
  "복합 인덱스의 두 번째 컬럼만 사용",
  "SELECT * FROM products WHERE price > 50000"
);
console.log("  -> 복합 인덱스(category, price)에서 price만 사용하면 인덱스를 타지 못한다.");
console.log("  -> 복합 인덱스는 왼쪽 컬럼부터 순서대로 사용해야 한다.");
console.log("");

// ============================================
// 핵심 정리
// ============================================
console.log("=== 핵심 정리 ===\n");
console.log("  EXPLAIN QUERY PLAN 읽는 법:");
console.log("    SCAN TABLE   = 전체 테이블 스캔 (느림, 대량 데이터에서 치명적)");
console.log("    SEARCH TABLE = 인덱스 사용 (빠름)");
console.log("    USING INDEX  = 어떤 인덱스를 사용하는지 표시");
console.log("");
console.log("  인덱스를 만들어야 하는 경우:");
console.log("    - WHERE 절에 자주 등장하는 컬럼");
console.log("    - JOIN 조건에 사용되는 컬럼");
console.log("    - ORDER BY에 사용되는 컬럼");
console.log("");
console.log("  인덱스 주의사항:");
console.log("    - INSERT/UPDATE/DELETE가 느려진다 (인덱스도 갱신해야 하므로)");
console.log("    - 읽기 중심 테이블에 적합. 쓰기 중심이면 신중하게.");
console.log("    - 새 쿼리를 작성하면 EXPLAIN으로 반드시 확인하라.");
