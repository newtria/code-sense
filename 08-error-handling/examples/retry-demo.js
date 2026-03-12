/**
 * 재시도(Retry) + 지수 백오프(Exponential Backoff) + 지터(Jitter) 데모
 * 실행: node retry-demo.js
 *
 * 네트워크 장애, 서버 과부하 등 일시적 오류에 대한
 * 올바른 재시도 전략을 이해한다.
 * 외부 의존성 없이 구현한다.
 */

// ============================================
// 1. 불안정한 외부 서비스 시뮬레이션
// ============================================
console.log("=== 재시도(Retry) 패턴 데모 ===\n");

// 에러 타입 정의
class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
    this.statusCode = 503;
  }
}

class TimeoutError extends Error {
  constructor(message) {
    super(message || "요청 시간 초과");
    this.name = "TimeoutError";
    this.statusCode = 408;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message || "인증 실패");
    this.name = "AuthError";
    this.statusCode = 401;
  }
}

// 70% 확률로 실패하는 서비스
let callCount = 0;
function unreliableService(label) {
  callCount++;
  const roll = Math.random();
  if (roll < 0.7) {
    // 70% 확률로 실패
    if (roll < 0.35) {
      throw new NetworkError("서버에 연결할 수 없습니다 (503)");
    } else {
      throw new TimeoutError();
    }
  }
  return { success: true, data: `${label} 응답 데이터`, attempt: callCount };
}

// ============================================
// 2. 재시도 없이 호출 (나쁜 방식)
// ============================================

console.log("--- 1단계: 재시도 없이 호출 (나쁜 방식) ---\n");
console.log("  70% 확률로 실패하는 서비스를 1번만 호출하면?\n");

// 여러 번 시도해서 실패 비율 확인
let noRetryFails = 0;
const noRetryTrials = 10;

for (let i = 0; i < noRetryTrials; i++) {
  try {
    unreliableService("단순 호출");
  } catch (err) {
    noRetryFails++;
  }
}

console.log(`  ${noRetryTrials}번 호출 결과: ${noRetryFails}번 실패 (${Math.round(noRetryFails / noRetryTrials * 100)}%)`);
console.log("  → 재시도 없이는 대부분 실패한다\n");

// ============================================
// 3. 재시도 유틸리티 구현
// ============================================

/**
 * 지수 백오프 + 지터를 적용한 재시도
 *
 * @param {Function} fn - 실행할 함수
 * @param {Object} options
 * @param {number} options.maxRetries - 최대 재시도 횟수 (기본 3)
 * @param {number} options.baseDelay - 기본 대기 시간 ms (기본 100)
 * @param {number} options.maxDelay - 최대 대기 시간 ms (기본 5000)
 * @param {boolean} options.useJitter - 지터 사용 여부 (기본 true)
 * @param {Function} options.shouldRetry - 재시도할지 판단하는 함수 (기본: 항상 true)
 * @param {Function} options.onRetry - 재시도 시 호출되는 콜백
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 5000,
    useJitter = true,
    shouldRetry = () => true,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn(attempt);
    } catch (err) {
      lastError = err;

      // 마지막 시도였으면 에러 전파
      if (attempt === maxRetries) break;

      // 재시도 가능한 에러인지 확인
      if (!shouldRetry(err)) {
        throw err; // 재시도 불가 → 즉시 실패
      }

      // 지수 백오프: 2^attempt * baseDelay
      let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // 지터 추가: 0 ~ delay 사이 랜덤
      if (useJitter) {
        delay = Math.floor(Math.random() * delay);
      }

      if (onRetry) {
        onRetry(attempt + 1, delay, err);
      }

      // 실제로는 await sleep(delay)이지만, 데모에서는 빠르게 진행
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 50)));
    }
  }

  throw lastError;
}

// ============================================
// 4. 재시도 적용 (올바른 방식)
// ============================================

(async () => {
  console.log("--- 2단계: 지수 백오프 + 지터로 재시도 (올바른 방식) ---\n");

  let successCount = 0;
  const retryTrials = 5;

  for (let trial = 1; trial <= retryTrials; trial++) {
    console.log(`  [시도 ${trial}]`);
    try {
      const result = await retry(
        () => unreliableService(`시도${trial}`),
        {
          maxRetries: 5,
          baseDelay: 100,
          useJitter: true,
          onRetry(attemptNum, delay, err) {
            console.log(`    재시도 #${attemptNum} (대기: ${delay}ms) — ${err.name}: ${err.message}`);
          },
        }
      );
      successCount++;
      console.log(`    성공! 데이터: ${result.data}`);
    } catch (err) {
      console.log(`    최종 실패: ${err.message}`);
    }
  }

  console.log(`\n  ${retryTrials}번 중 ${successCount}번 성공`);
  console.log("  → 재시도를 적용하면 성공률이 크게 올라간다\n");

  // ============================================
  // 5. 지터(Jitter)의 중요성 — Thundering Herd 방지
  // ============================================

  console.log("--- 3단계: 지터(Jitter)의 중요성 ---\n");

  console.log("  지터 없이 (모든 클라이언트가 동시에 재시도):");
  console.log("  ┌────────┬────────────────────────────────────────┐");
  console.log("  │ 시도   │ 대기 시간                             │");
  console.log("  ├────────┼────────────────────────────────────────┤");

  for (let i = 0; i < 4; i++) {
    const delay = Math.min(100 * Math.pow(2, i), 5000);
    const bar = "█".repeat(Math.floor(delay / 50));
    console.log(`  │ ${i + 1}번째  │ ${String(delay).padStart(5)}ms ${bar.padEnd(30)} │`);
  }

  console.log("  └────────┴────────────────────────────────────────┘");
  console.log("  → 100대의 서버가 동시에 재시도하면? 서버가 또 죽는다! (Thundering Herd)\n");

  console.log("  지터 적용 (각 클라이언트가 랜덤 시점에 재시도):");
  console.log("  ┌────────┬────────────────────────────────────────┐");
  console.log("  │ 시도   │ 대기 시간 (랜덤)                      │");
  console.log("  ├────────┼────────────────────────────────────────┤");

  for (let i = 0; i < 4; i++) {
    const maxDelay = Math.min(100 * Math.pow(2, i), 5000);
    const jitteredDelay = Math.floor(Math.random() * maxDelay);
    const bar = "█".repeat(Math.floor(jitteredDelay / 50));
    console.log(`  │ ${i + 1}번째  │ ${String(jitteredDelay).padStart(5)}ms ${bar.padEnd(30)} │`);
  }

  console.log("  └────────┴────────────────────────────────────────┘");
  console.log("  → 재시도 타이밍이 분산되어 서버 부담이 줄어든다\n");

  // ============================================
  // 6. 재시도해야 하는 에러 vs 하면 안 되는 에러
  // ============================================

  console.log("--- 4단계: 재시도 가능 vs 불가능 ---\n");

  // 재시도 판단 함수
  function isRetryableError(err) {
    // 5xx 서버 에러, 타임아웃, 네트워크 에러 → 재시도
    if (err instanceof NetworkError) return true;
    if (err instanceof TimeoutError) return true;
    if (err.statusCode >= 500) return true;

    // 4xx 클라이언트 에러 → 재시도 불가 (몇 번을 해도 같은 결과)
    if (err instanceof ValidationError) return false;
    if (err instanceof AuthError) return false;
    if (err.statusCode >= 400 && err.statusCode < 500) return false;

    return false;
  }

  const testErrors = [
    { error: new NetworkError("서버 연결 실패 (503)"), label: "NetworkError (503)" },
    { error: new TimeoutError(), label: "TimeoutError (408)" },
    { error: new ValidationError("이메일 형식 오류"), label: "ValidationError (400)" },
    { error: new AuthError(), label: "AuthError (401)" },
  ];

  console.log("  ┌────────────────────────────┬──────────┬──────────────────────────┐");
  console.log("  │ 에러 타입                   │ 재시도?  │ 이유                     │");
  console.log("  ├────────────────────────────┼──────────┼──────────────────────────┤");

  const reasons = {
    "NetworkError (503)":  "서버 과부하, 곧 복구 가능  ",
    "TimeoutError (408)":  "일시적 지연, 재시도 의미有 ",
    "ValidationError (400)": "입력이 잘못됨, 고쳐야 함  ",
    "AuthError (401)":     "토큰 만료, 재인증 필요     ",
  };

  for (const { error, label } of testErrors) {
    const retryable = isRetryableError(error);
    const symbol = retryable ? "O 재시도" : "X 즉시실패";
    console.log(`  │ ${label.padEnd(27)}│ ${symbol.padEnd(9)}│ ${reasons[label]}│`);
  }

  console.log("  └────────────────────────────┴──────────┴──────────────────────────┘\n");

  // 실제 동작 확인: ValidationError는 재시도하지 않는다
  console.log("  검증: ValidationError에 재시도를 시도하면?");
  try {
    await retry(
      () => { throw new ValidationError("이메일 형식이 올바르지 않습니다"); },
      {
        maxRetries: 3,
        shouldRetry: isRetryableError,
        onRetry(attempt) {
          console.log(`    재시도 #${attempt} — 이 줄은 출력되면 안 된다`);
        },
      }
    );
  } catch (err) {
    console.log(`    → 즉시 실패: ${err.name}: ${err.message}`);
    console.log("    → 재시도 없이 바로 에러를 반환했다 (올바른 동작)\n");
  }

  // ============================================
  // 핵심 정리
  // ============================================
  console.log(`${"=".repeat(40)}`);
  console.log("핵심 정리:");
  console.log("1. 일시적 오류(5xx, 타임아웃, 네트워크)에만 재시도하라");
  console.log("2. 클라이언트 오류(4xx)는 재시도해도 같은 결과 — 즉시 실패 처리");
  console.log("3. 지수 백오프: 2^n * baseDelay로 대기 시간을 늘려라");
  console.log("4. 지터(Jitter): 랜덤 대기로 Thundering Herd를 방지하라");
  console.log("5. 최대 재시도 횟수와 최대 대기 시간을 반드시 설정하라");
  console.log("6. shouldRetry 함수로 재시도 가능 여부를 명확히 구분하라");
})();
