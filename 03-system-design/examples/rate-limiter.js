/**
 * Rate Limiter 구현 예제
 * 실행: node rate-limiter.js
 *
 * Fixed Window 방식과 Token Bucket 방식을 비교.
 */

// ============================================
// 1. Fixed Window Rate Limiter
// ============================================
class FixedWindowLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.windows = new Map(); // key -> { count, start }
  }

  isAllowed(key) {
    const now = Date.now();
    const record = this.windows.get(key);

    // 윈도우가 없거나 만료됨 → 새 윈도우
    if (!record || now - record.start >= this.windowMs) {
      this.windows.set(key, { count: 1, start: now });
      return true;
    }

    // 현재 윈도우에서 한도 초과 확인
    if (record.count >= this.maxRequests) {
      return false; // 429 Too Many Requests
    }

    record.count++;
    return true;
  }
}

// ============================================
// 2. Token Bucket Rate Limiter
// ============================================
class TokenBucketLimiter {
  constructor(maxTokens, refillRate) {
    this.maxTokens = maxTokens; // 버킷 용량
    this.refillRate = refillRate; // 초당 토큰 보충 수
    this.buckets = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // 경과 시간에 비례하여 토큰 보충
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.maxTokens,
      bucket.tokens + elapsed * this.refillRate
    );
    bucket.lastRefill = now;

    // 토큰 소모
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }
}

// ============================================
// 시뮬레이션
// ============================================
(async () => {
console.log("=== Rate Limiter 데모 ===\n");

// Fixed Window: 1초에 5회까지
console.log("1. Fixed Window (1초에 5회 제한):\n");
const fixedLimiter = new FixedWindowLimiter(5, 1000);

for (let i = 1; i <= 8; i++) {
  const allowed = fixedLimiter.isAllowed("user:1");
  console.log(
    `   요청 ${i}: ${allowed ? "허용" : "차단 (429 Too Many Requests)"}`
  );
}

// Token Bucket: 버킷 용량 5, 초당 2개 보충
console.log("\n2. Token Bucket (용량 5, 초당 2개 보충):\n");
const tokenLimiter = new TokenBucketLimiter(5, 2);

// 처음 5개는 즉시 허용
for (let i = 1; i <= 7; i++) {
  const allowed = tokenLimiter.isAllowed("user:1");
  console.log(
    `   요청 ${i}: ${allowed ? "허용" : "차단"}`
  );
}

// 1초 후 토큰이 보충됨
console.log("\n   (1초 대기...)\n");
await new Promise((r) => setTimeout(r, 1000));

for (let i = 8; i <= 10; i++) {
  const allowed = tokenLimiter.isAllowed("user:1");
  console.log(
    `   요청 ${i}: ${allowed ? "허용 (토큰 보충됨)" : "차단"}`
  );
}

console.log("\n=== 비교 ===\n");
console.log("Fixed Window:");
console.log("  + 구현이 간단");
console.log("  - 윈도우 경계에서 2배 트래픽 가능 (0:59에 5회 + 1:00에 5회)");
console.log("");
console.log("Token Bucket:");
console.log("  + 버스트 허용하면서도 평균 속도 제한");
console.log("  + 더 부드러운 트래픽 제어");
console.log("  - 구현이 약간 복잡");
console.log("");
console.log("실무 적용:");
console.log("  - API 서버: IP당 분당 100회, 유저당 초당 10회 등");
console.log("  - 로그인: IP당 분당 5회 (브루트포스 방지)");
console.log("  - 응답 헤더로 남은 횟수 안내:");
console.log("    X-RateLimit-Limit: 100");
console.log("    X-RateLimit-Remaining: 95");
console.log("    X-RateLimit-Reset: 1720000060");
})();
