/**
 * 데이터베이스 기초 실습 (SQLite — 설치 불필요)
 * 실행: node database-basics.js
 *
 * Node.js 22+: 내장 node:sqlite 사용 (experimental 경고 무시 가능)
 * Node.js 22 미만: npm install better-sqlite3 후 실행
 */

const { loadSQLite } = require("./sqlite-loader");
const Database = loadSQLite();

const db = new Database(":memory:"); // 메모리 DB (파일 생성 안 함)

// ============================================
// 1. 테이블 생성
// ============================================
console.log("=== 1. 테이블 생성 ===\n");

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
console.log("users, posts 테이블 생성 완료\n");

// ============================================
// 2. 데이터 삽입 (INSERT)
// ============================================
console.log("=== 2. 데이터 삽입 ===\n");

// Parameterized Query — SQL Injection 방어의 핵심
const insertUser = db.prepare(
  "INSERT INTO users (name, email) VALUES (?, ?)"
);
const insertPost = db.prepare(
  "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)"
);

insertUser.run("홍길동", "hong@test.com");
insertUser.run("김영희", "kim@test.com");
insertUser.run("이철수", "lee@test.com");

insertPost.run(1, "첫 번째 글", "안녕하세요");
insertPost.run(1, "두 번째 글", "반갑습니다");
insertPost.run(2, "영희의 글", "저도 안녕하세요");
// 이철수는 게시글 없음 (LEFT JOIN 테스트용)

console.log("유저 3명, 게시글 3개 삽입 완료\n");

// ============================================
// 3. 조회 (SELECT)
// ============================================
console.log("=== 3. 기본 조회 ===\n");

const users = db.prepare("SELECT * FROM users").all();
console.log("전체 유저:", users);

const hong = db.prepare("SELECT * FROM users WHERE email = ?").get(
  "hong@test.com"
);
console.log("홍길동:", hong);
console.log();

// ============================================
// 4. JOIN
// ============================================
console.log("=== 4. JOIN ===\n");

// INNER JOIN: 양쪽에 매칭되는 것만
console.log("INNER JOIN (게시글 있는 유저만):");
const innerJoin = db
  .prepare(
    `
  SELECT u.name, p.title
  FROM users u
  INNER JOIN posts p ON u.id = p.user_id
`
  )
  .all();
console.log(innerJoin);
console.log();

// LEFT JOIN: 왼쪽(users) 전부 + 오른쪽은 있으면
console.log("LEFT JOIN (모든 유저 + 게시글):");
const leftJoin = db
  .prepare(
    `
  SELECT u.name, p.title
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
`
  )
  .all();
console.log(leftJoin);
console.log("→ 이철수는 title이 null (게시글 없음)\n");

// ============================================
// 5. 집계 (GROUP BY)
// ============================================
console.log("=== 5. 집계 ===\n");

const postCounts = db
  .prepare(
    `
  SELECT u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  GROUP BY u.id
  ORDER BY post_count DESC
`
  )
  .all();
console.log("유저별 게시글 수:", postCounts);
console.log();

// ============================================
// 6. 인덱스 효과
// ============================================
console.log("=== 6. 인덱스 ===\n");

// 대량 데이터 삽입 — 인덱스 유무에 따른 검색 속도 차이를 체감하기 위해 10만 건 사용
console.log("10만 건 데이터 삽입 중...");
const insertMany = db.prepare(
  "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)"
);

db.exec("BEGIN");
for (let i = 0; i < 100000; i++) {
  insertMany.run(
    (i % 3) + 1,
    `게시글 ${i}`,
    `내용 ${i}`
  );
}
db.exec("COMMIT");
console.log("삽입 완료\n");

// 인덱스 없이 검색 — 데이터셋 중간 값(50000)을 검색하여 풀 스캔 시간 측정
console.time("인덱스 없이 검색");
db.prepare("SELECT * FROM posts WHERE title = '게시글 50000'").get();
console.timeEnd("인덱스 없이 검색");

// 인덱스 생성
db.exec("CREATE INDEX idx_posts_title ON posts(title)");

// 인덱스 있으면 검색
console.time("인덱스 있으면 검색");
db.prepare("SELECT * FROM posts WHERE title = '게시글 50000'").get();
console.timeEnd("인덱스 있으면 검색");

console.log("→ 데이터가 많을수록 차이가 극적으로 벌어진다\n");

// ============================================
// 7. 트랜잭션
// ============================================
console.log("=== 7. 트랜잭션 ===\n");

db.exec(`
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    owner TEXT NOT NULL,
    balance INTEGER NOT NULL CHECK(balance >= 0)
  );
  INSERT INTO accounts VALUES (1, '홍길동', 100000);
  INSERT INTO accounts VALUES (2, '김영희', 50000);
`);

console.log("이체 전:");
console.log(db.prepare("SELECT * FROM accounts").all());

// 트랜잭션으로 이체 (전부 성공하거나 전부 실패)
function transfer(from, to, amount) {
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(
      amount,
      from
    );
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(
      amount,
      to
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

transfer(1, 2, 30000); // 홍길동 → 김영희 3만원

console.log("\n이체 후 (홍길동 → 김영희 3만원):");
console.log(db.prepare("SELECT * FROM accounts").all());

// 실패하는 이체 시도 (잔액 부족 — CHECK 제약조건)
console.log("\n잔액 초과 이체 시도 (홍길동 → 김영희 100만원):");
try {
  transfer(1, 2, 1000000);
} catch (err) {
  console.log(`실패: ${err.message}`);
  console.log("→ 트랜잭션이 롤백되어 양쪽 잔액 모두 변하지 않음");
  console.log(db.prepare("SELECT * FROM accounts").all());
}
