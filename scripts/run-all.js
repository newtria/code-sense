/**
 * 모든 예제를 순차 실행하고 exit code를 검증하는 CI 스크립트.
 * 실행: node scripts/run-all.js
 */

const { execSync } = require("child_process");
const path = require("path");

// 서버 예제(rest-api-server.js, server.js)는 listen 후 종료하지 않으므로 제외.
// git-playground.sh는 임시 디렉토리에 git repo를 생성하므로 제외.
const examples = [
  // [설명, 명령어]
  ["JWT 인증", "node 01-network/examples/jwt-auth-example.js"],
  ["CORS 데모", "node 01-network/examples/cors-demo.js"],
  ["JWT + REST 통합", "node 01-network/examples/jwt-rest-integration.js"],
  ["REST API 통합 테스트", "node 01-network/examples/rest-api-test.js"],
  ["DB 기초", "node 02-database/examples/database-basics.js"],
  ["N+1 문제", "node 02-database/examples/n-plus-one.js"],
  ["EXPLAIN QUERY PLAN", "node 02-database/examples/explain-demo.js"],
  ["커서 페이지네이션", "node 02-database/examples/cursor-pagination.js"],
  ["Cache-Aside", "node 03-system-design/examples/cache-aside.js"],
  ["Rate Limiter", "node 03-system-design/examples/rate-limiter.js"],
  ["Circuit Breaker", "node 03-system-design/examples/circuit-breaker.js"],
  ["Sliding Window", "node 03-system-design/examples/sliding-window.js"],
  ["SQL Injection", "node 04-security/examples/sql-injection-demo.js"],
  ["XSS", "node 04-security/examples/xss-demo.js"],
  ["비밀번호 해싱", "node 04-security/examples/password-hashing.js"],
  ["CSRF", "node 04-security/examples/csrf-demo.js"],
  ["Event Loop", "node 05-concurrency/examples/event-loop-quiz.js"],
  ["Race Condition", "node 05-concurrency/examples/race-condition-demo.js"],
  ["Deadlock", "node 05-concurrency/examples/deadlock-demo.js"],
  ["Promise 패턴", "node 05-concurrency/examples/promise-patterns.js"],
  ["테스트 러너", "node 07-testing/examples/test-runner.js"],
  ["비동기 테스트", "node 07-testing/examples/async-test-demo.js"],
  ["모킹/스파이", "node 07-testing/examples/mock-demo.js"],
  ["에러 핸들링", "node 08-error-handling/examples/error-handling-demo.js"],
  ["재시도 (Exponential Backoff)", "node 08-error-handling/examples/retry-demo.js"],
  ["글로벌 에러 핸들러", "node 08-error-handling/examples/global-handlers-demo.js"],
];

const root = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;

console.log(`\n=== ${examples.length}개 예제 실행 ===\n`);

for (const [name, cmd] of examples) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe", timeout: 30000 });
    passed++;
    console.log(`  OK  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}`);
    if (err.stderr) console.log(`       ${err.stderr.toString().trim()}`);
  }
}

console.log(`\n결과: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
