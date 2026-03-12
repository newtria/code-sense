/**
 * Sliding Window Log Rate Limiter 구현 예제
 * 실행: node sliding-window.js
 *
 * Fixed Window의 경계 문제(2배 버스트)를 보여주고,
 * Sliding Window Log 방식으로 해결한다.
 *
 * 참고: rate-limiter.js에서 Fixed Window와 Token Bucket을 다뤘다.
 * 이 파일은 Fixed Window의 약점과 Sliding Window의 해결을 집중 비교한다.
 */

// ============================================
// 1. Fixed Window — 경계 문제 재현
// ============================================
class FixedWindowLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.windows = new Map();
  }

  isAllowed(key, timestamp) {
    const windowStart = Math.floor(timestamp / this.windowMs) * this.windowMs;
    const windowKey = `${key}:${windowStart}`;
    const record = this.windows.get(windowKey);

    if (!record) {
      this.windows.set(windowKey, { count: 1 });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}

// ============================================
// 2. Sliding Window Log — 정확한 제한
// ============================================
class SlidingWindowLogLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.logs = new Map(); // key -> [timestamp, timestamp, ...]
  }

  isAllowed(key, timestamp) {
    if (!this.logs.has(key)) {
      this.logs.set(key, []);
    }

    const log = this.logs.get(key);
    const windowStart = timestamp - this.windowMs;

    // 윈도우 밖의 오래된 기록 제거
    while (log.length > 0 && log[0] <= windowStart) {
      log.shift();
    }

    // 현재 윈도우 내 요청 수 확인
    if (log.length >= this.maxRequests) {
      return false;
    }

    log.push(timestamp);
    return true;
  }
}

// ============================================
// Fixed Window 경계 문제 시연
// ============================================
function demonstrateBoundaryProblem() {
  console.log("=== 1. Fixed Window 경계 문제 ===\n");
  console.log("규칙: 1초(1000ms) 윈도우에 5회 제한\n");
  console.log("문제: 윈도우 경계에서 2배 버스트가 가능하다!\n");

  const fixed = new FixedWindowLimiter(5, 1000);

  // 윈도우 끝자락(900~999ms)에 5회 요청
  console.log("[시나리오] 0:00.900 ~ 0:00.999에 5회, 0:01.000 ~ 0:01.099에 5회 요청");
  console.log("");

  console.log("첫 번째 윈도우 끝자락 (t=900~999ms):");
  for (let i = 0; i < 5; i++) {
    const t = 900 + i * 20;
    const allowed = fixed.isAllowed("user:1", t);
    console.log(`  t=${String(t).padStart(4)}ms: ${allowed ? "허용" : "차단"}`);
  }

  console.log("\n두 번째 윈도우 시작 (t=1000~1099ms):");
  for (let i = 0; i < 5; i++) {
    const t = 1000 + i * 20;
    const allowed = fixed.isAllowed("user:1", t);
    console.log(`  t=${String(t).padStart(4)}ms: ${allowed ? "허용" : "차단"}`);
  }

  console.log("\n→ 200ms 사이에 10회 요청이 모두 허용됨!");
  console.log("→ 초당 5회 제한인데, 실질적으로 200ms에 10회 통과 (2배 버스트)\n");
}

// ============================================
// Sliding Window Log로 해결
// ============================================
function demonstrateSlidingWindow() {
  console.log("=== 2. Sliding Window Log로 해결 ===\n");
  console.log("동일한 시나리오를 Sliding Window Log로 실행:\n");

  const sliding = new SlidingWindowLogLimiter(5, 1000);

  console.log("첫 번째 구간 (t=900~999ms):");
  for (let i = 0; i < 5; i++) {
    const t = 900 + i * 20;
    const allowed = sliding.isAllowed("user:1", t);
    console.log(`  t=${String(t).padStart(4)}ms: ${allowed ? "허용" : "차단"}`);
  }

  console.log("\n두 번째 구간 (t=1000~1099ms):");
  for (let i = 0; i < 5; i++) {
    const t = 1000 + i * 20;
    const allowed = sliding.isAllowed("user:1", t);
    console.log(`  t=${String(t).padStart(4)}ms: ${allowed ? "허용" : "차단"}`);
  }

  console.log("\n→ t=1000~1099ms 요청은 전부 차단!");
  console.log("→ 과거 1000ms 이내에 이미 5회 기록이 있으므로 정확히 제한");
  console.log("→ t=900의 기록이 만료(t=1900 이후)되어야 새 요청 허용\n");
}

// ============================================
// Sliding Window Log가 통과시키는 시점 확인
// ============================================
function demonstrateRecovery() {
  console.log("=== 3. 언제 다시 허용되는가? ===\n");

  // t=900~980에 5회 사용
  const timestamps = [900, 920, 940, 960, 980];
  console.log(`t=${timestamps.join(", ")}에 5회 요청 완료\n`);

  // 다양한 시점에서 시도
  const testTimes = [1000, 1500, 1899, 1901, 1950, 1981];
  for (const t of testTimes) {
    // 매번 새 인스턴스로 동일 기록 재현하여 독립 테스트
    const testLimiter = new SlidingWindowLogLimiter(5, 1000);
    for (const ts of timestamps) {
      testLimiter.isAllowed("user:1", ts);
    }
    const allowed = testLimiter.isAllowed("user:1", t);
    const remaining = timestamps.filter((ts) => ts > t - 1000).length;
    console.log(`  t=${String(t).padStart(4)}ms: ${allowed ? "허용" : "차단"} — 윈도우 [${t - 1000}, ${t}] 내 ${remaining}개 기록`);
  }

  console.log("\n→ t=1901ms부터 허용: 가장 오래된 기록(t=900)이 윈도우 밖으로 나감\n");
}

// ============================================
// 실행
// ============================================
function main() {
  console.log("=== Sliding Window Rate Limiter 데모 ===\n");

  demonstrateBoundaryProblem();
  demonstrateSlidingWindow();
  demonstrateRecovery();

  console.log("=== 비교 정리 ===\n");
  console.log("Fixed Window:");
  console.log("  + 메모리 효율적 (윈도우당 카운터 1개)");
  console.log("  + 구현 간단");
  console.log("  - 경계에서 2배 버스트 가능\n");

  console.log("Sliding Window Log:");
  console.log("  + 정확한 제한 (경계 문제 없음)");
  console.log("  - 요청마다 타임스탬프 저장 → 메모리 사용 많음");
  console.log("  - 오래된 기록 정리 비용\n");

  console.log("Sliding Window Counter (절충안, 실무 추천):");
  console.log("  현재 윈도우 카운트 + 이전 윈도우 카운트 × 겹치는 비율");
  console.log("  예: 이전 윈도우 4회, 현재 윈도우 2회, 현재 위치 30%");
  console.log("     → 추정 요청 수 = 4 × 0.7 + 2 = 4.8");
  console.log("  + 메모리 효율 (윈도우당 카운터 2개)");
  console.log("  + 경계 버스트 완화 (완벽하진 않지만 충분)\n");

  console.log("실무 적용:");
  console.log("  - Redis ZSET으로 Sliding Window Log 구현 가능");
  console.log("    ZADD rate:{userId} {timestamp} {requestId}");
  console.log("    ZREMRANGEBYSCORE rate:{userId} 0 {windowStart}");
  console.log("    ZCARD rate:{userId}");
}

main();
