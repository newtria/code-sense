/**
 * SQL Injection 공격과 방어 데모
 * 실행: node sql-injection-demo.js
 *
 * 실제 공격이 어떻게 동작하는지 이해하고, 방어법을 익힌다.
 */

const { loadSQLite } = require("../../02-database/examples/sqlite-loader");
const Database = loadSQLite();

const db = new Database(":memory:");

// 테이블 생성 및 데이터 삽입
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );
  -- 데모용 평문 비밀번호. 실무에서는 반드시 scrypt로 해싱하라 (04-security/examples/password-hashing.js 참고).
  INSERT INTO users VALUES (1, 'admin', 'super_secret_pw', 'admin');
  INSERT INTO users VALUES (2, 'hong', 'password123', 'user');
  INSERT INTO users VALUES (3, 'kim', 'mypassword', 'user');
`);

console.log("=== SQL Injection 데모 ===\n");
console.log("DB에 저장된 유저:");
console.log(db.prepare("SELECT id, username, role FROM users").all());
console.log();

// ============================================
// 1. 취약한 코드 (문자열 조합)
// ============================================
console.log("=== 1. 취약한 코드 ===\n");

function loginUnsafe(username, password) {
  // AI가 자주 만드는 위험한 패턴
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  console.log(`  실행되는 쿼리: ${query}`);
  try {
    return db.prepare(query).get();
  } catch (err) {
    console.log(`  에러: ${err.message}`);
    return null;
  }
}

// 정상 로그인
console.log("정상 로그인 시도:");
const normal = loginUnsafe("hong", "password123");
console.log(`  결과: ${normal ? "성공 — " + normal.username : "실패"}\n`);

// 공격: 비밀번호 없이 로그인
console.log("공격: 비밀번호 우회");
const attack1 = loginUnsafe("admin' --", "아무거나");
// 실행되는 쿼리: SELECT * FROM users WHERE username = 'admin' --' AND password = '아무거나'
// --는 SQL 주석 = 비밀번호 검사가 무시됨
console.log(
  `  결과: ${attack1 ? "성공! admin으로 로그인됨 (비밀번호 없이)" : "실패"}\n`
);

// 공격: 모든 유저 정보 탈취
console.log("공격: OR 1=1 로 모든 유저 조회");
const query = `SELECT * FROM users WHERE username = '' OR 1=1 --' AND password = ''`;
console.log(`  실행되는 쿼리: ${query}`);
const allUsers = db.prepare(query).all();
console.log(`  결과: ${allUsers.length}명의 모든 유저 정보 탈취됨`);
console.log(allUsers);
console.log();

// ============================================
// 2. 안전한 코드 (Parameterized Query)
// ============================================
console.log("=== 2. 안전한 코드 ===\n");

function loginSafe(username, password) {
  // 파라미터는 값으로만 처리됨 — SQL로 해석되지 않음
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  console.log(`  쿼리: ${query}`);
  console.log(`  파라미터: ['${username}', '${password}']`);
  return db.prepare(query).get(username, password);
}

// 같은 공격 시도
console.log("같은 공격 시도 (Parameterized Query):");
const safeResult = loginSafe("admin' --", "아무거나");
console.log(
  `  결과: ${safeResult ? "성공" : "실패 — 공격이 무력화됨"}`
);
console.log(
  '  → "admin\' --"가 문자열 값 그대로 검색됨 (SQL로 해석되지 않음)\n'
);

console.log("=== 핵심 정리 ===");
console.log("1. 절대로 문자열 조합으로 SQL을 만들지 마라");
console.log(
  "2. 항상 Parameterized Query (?, $1 등)를 사용하라"
);
console.log(
  "3. ORM을 쓰더라도 raw query 시에는 동일한 규칙 적용"
);
console.log("4. AI가 만든 코드에 문자열 조합 SQL이 있으면 즉시 수정하라");
