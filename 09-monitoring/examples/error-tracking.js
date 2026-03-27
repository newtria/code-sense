/**
 * 에러 추적과 집계 데모
 * 실행: node error-tracking.js
 *
 * 에러를 분류(일시적 vs 영구적)하고, 에러율을 모니터링하고,
 * 서킷 브레이커 상태를 관찰하는 방법을 이해한다.
 * 외부 의존성 없이 구현한다.
 */

// ============================================
// 1. 에러 분류: 일시적(Transient) vs 영구적(Permanent)
// ============================================
console.log("=== 1. 에러 분류: 일시적 vs 영구적 ===\n");

// 에러 타입 정의
class TransientError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "TransientError";
    this.transient = true;
    this.code = code;
  }
}

class PermanentError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "PermanentError";
    this.transient = false;
    this.code = code;
  }
}

// 에러 분류 함수
function classifyError(err) {
  // HTTP 상태 코드 기반 분류
  if (err.statusCode) {
    // 5xx 서버 에러 → 일시적 (서버가 복구되면 성공할 수 있다)
    if (err.statusCode >= 500) return "transient";
    // 429 Too Many Requests → 일시적 (Rate Limit 해제되면 성공)
    if (err.statusCode === 429) return "transient";
    // 408 Request Timeout → 일시적
    if (err.statusCode === 408) return "transient";
    // 4xx 클라이언트 에러 → 영구적 (요청 자체가 잘못됨)
    if (err.statusCode >= 400) return "permanent";
  }

  // 에러 코드 기반 분류
  const transientCodes = [
    "ECONNREFUSED",   // 연결 거부 → 서버 재시작 중일 수 있다
    "ECONNRESET",     // 연결 초기화 → 네트워크 순간 끊김
    "ETIMEDOUT",      // 타임아웃 → 일시적 지연
    "ENOTFOUND",      // DNS 해석 실패 → 일시적일 수 있다
    "EAI_AGAIN",      // DNS 일시적 실패
  ];

  if (transientCodes.includes(err.code)) return "transient";

  // 기본값: 영구적으로 간주 (안전한 쪽으로)
  return "permanent";
}

// 분류 예시
const testErrors = [
  { message: "서버 내부 오류", statusCode: 500, code: "INTERNAL_ERROR" },
  { message: "서비스 일시 불가", statusCode: 503, code: "SERVICE_UNAVAILABLE" },
  { message: "요청 제한 초과", statusCode: 429, code: "RATE_LIMITED" },
  { message: "잘못된 입력", statusCode: 400, code: "BAD_REQUEST" },
  { message: "인증 실패", statusCode: 401, code: "UNAUTHORIZED" },
  { message: "권한 없음", statusCode: 403, code: "FORBIDDEN" },
  { message: "연결 거부", code: "ECONNREFUSED" },
  { message: "연결 타임아웃", code: "ETIMEDOUT" },
];

console.log("  에러                    │ 분류      │ 재시도 │ 이유");
console.log("  ────────────────────────┼───────────┼────────┼──────────────────");

for (const err of testErrors) {
  const category = classifyError(err);
  const retryable = category === "transient" ? "O" : "X";
  const reasons = {
    "서버 내부 오류": "서버 버그지만 재시작 후 복구 가능",
    "서비스 일시 불가": "서버 과부하, 곧 복구될 수 있음",
    "요청 제한 초과": "잠시 후 재시도하면 성공",
    "잘못된 입력": "요청 자체가 잘못됨, 고쳐야 함",
    "인증 실패": "토큰 재발급 필요, 재시도 무의미",
    "권한 없음": "권한 설정 변경 필요",
    "연결 거부": "서버 재시작 중일 수 있음",
    "연결 타임아웃": "네트워크 일시 장애",
  };
  const label = category === "transient" ? "일시적" : "영구적";
  console.log(
    `  ${err.message.padEnd(22)} │ ${label.padEnd(7)}  │   ${retryable}    │ ${reasons[err.message]}`
  );
}

console.log("\n  → 일시적 에러: 재시도 가치 있음 (백오프 적용)");
console.log("  → 영구적 에러: 즉시 실패 반환 (재시도해도 같은 결과)\n");

// ============================================
// 2. 에러율 모니터링과 알림
// ============================================
console.log("=== 2. 에러율 모니터링과 알림 ===\n");

class ErrorRateMonitor {
  /**
   * @param {Object} options
   * @param {number} options.windowMs - 측정 윈도우 크기 (밀리초)
   * @param {number} options.errorThreshold - 알림 발생 에러율 (0~1)
   * @param {number} options.minSamples - 최소 샘플 수 (이 이상이어야 알림)
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 기본 1분
    this.errorThreshold = options.errorThreshold || 0.1; // 10%
    this.minSamples = options.minSamples || 10;
    this.events = []; // { timestamp, isError, category }
    this.alerts = [];
  }

  // 요청 결과 기록
  record(isError, category = "unknown") {
    const now = Date.now();
    this.events.push({ timestamp: now, isError, category });
    this._cleanup(now);
    this._checkAlert(now);
  }

  // 오래된 이벤트 제거
  _cleanup(now) {
    const cutoff = now - this.windowMs;
    this.events = this.events.filter((e) => e.timestamp > cutoff);
  }

  // 알림 조건 확인
  _checkAlert(now) {
    if (this.events.length < this.minSamples) return;

    const errorCount = this.events.filter((e) => e.isError).length;
    const errorRate = errorCount / this.events.length;

    if (errorRate >= this.errorThreshold) {
      // 에러율 카테고리별 분석
      const byCategory = {};
      for (const e of this.events.filter((ev) => ev.isError)) {
        byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      }

      const alert = {
        timestamp: new Date(now).toISOString(),
        errorRate: (errorRate * 100).toFixed(1),
        errorCount,
        totalCount: this.events.length,
        window: `${this.windowMs / 1000}s`,
        breakdown: byCategory,
      };

      this.alerts.push(alert);
    }
  }

  // 현재 상태 반환
  getStatus() {
    const errorCount = this.events.filter((e) => e.isError).length;
    const total = this.events.length;
    const errorRate = total > 0 ? errorCount / total : 0;

    return {
      currentErrorRate: (errorRate * 100).toFixed(1) + "%",
      totalRequests: total,
      errorCount,
      threshold: (this.errorThreshold * 100).toFixed(0) + "%",
      status: errorRate >= this.errorThreshold ? "ALERT" : "OK",
    };
  }
}

const monitor = new ErrorRateMonitor({
  windowMs: 60000,
  errorThreshold: 0.1, // 에러율 10% 초과 시 알림
  minSamples: 10,
});

// 시나리오 시뮬레이션: 점진적으로 에러 증가
console.log("시나리오: 에러율이 서서히 증가하는 상황\n");

// Phase 1: 정상 (에러율 ~2%)
console.log("Phase 1 — 정상 상태:");
for (let i = 0; i < 50; i++) {
  const isError = Math.random() < 0.02;
  monitor.record(isError, isError ? "timeout" : null);
}
let status = monitor.getStatus();
console.log(`  에러율: ${status.currentErrorRate} (임계치: ${status.threshold}) → ${status.status}\n`);

// Phase 2: 에러 증가 (에러율 ~15%)
console.log("Phase 2 — DB 장애 시작:");
for (let i = 0; i < 30; i++) {
  const isError = Math.random() < 0.15;
  const category = isError ? (Math.random() < 0.7 ? "database" : "timeout") : null;
  monitor.record(isError, category);
}
status = monitor.getStatus();
console.log(`  에러율: ${status.currentErrorRate} (임계치: ${status.threshold}) → ${status.status}`);

if (monitor.alerts.length > 0) {
  const lastAlert = monitor.alerts[monitor.alerts.length - 1];
  console.log(`  알림 발생! 에러 분류: ${JSON.stringify(lastAlert.breakdown)}`);
  console.log("  → database 에러가 대부분 → DB 장애 가능성 높음");
}
console.log();

// Phase 3: 복구
console.log("Phase 3 — 장애 복구 후:");
// 기존 이벤트를 비우고 정상 트래픽으로 교체
monitor.events = [];
for (let i = 0; i < 50; i++) {
  monitor.record(Math.random() < 0.01, "timeout");
}
status = monitor.getStatus();
console.log(`  에러율: ${status.currentErrorRate} (임계치: ${status.threshold}) → ${status.status}\n`);

// ============================================
// 3. 에러 집계기 (Error Aggregator)
// ============================================
console.log("=== 3. 에러 집계기 ===\n");

class ErrorAggregator {
  constructor() {
    this.errors = new Map(); // fingerprint → { count, firstSeen, lastSeen, sample }
  }

  // 에러 등록 (같은 종류의 에러를 묶는다)
  track(err) {
    // 에러 핑거프린트: 에러 이름 + 메시지 (스택의 첫 줄)를 조합
    const fingerprint = this._getFingerprint(err);
    const now = new Date().toISOString();

    if (this.errors.has(fingerprint)) {
      const existing = this.errors.get(fingerprint);
      existing.count++;
      existing.lastSeen = now;
    } else {
      this.errors.set(fingerprint, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        name: err.name || "Error",
        message: err.message,
        category: classifyError(err),
        sample: err, // 원본 에러 하나를 보존 (디버깅용)
      });
    }
  }

  // 에러 핑거프린트 생성
  _getFingerprint(err) {
    // 에러 타입 + 메시지를 키로 사용
    return `${err.name || "Error"}:${err.message}`;
  }

  // 에러 요약 반환 (발생 횟수 내림차순)
  getSummary() {
    return [...this.errors.values()]
      .sort((a, b) => b.count - a.count)
      .map((e) => ({
        name: e.name,
        message: e.message,
        category: e.category,
        count: e.count,
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
      }));
  }
}

const aggregator = new ErrorAggregator();

// 시뮬레이션: 다양한 에러 발생
const simulatedErrors = [
  // 같은 에러가 여러 번 발생
  ...Array(25).fill(null).map(() => {
    const e = new Error("ECONNREFUSED: 결제 서비스 연결 실패");
    e.name = "NetworkError";
    e.code = "ECONNREFUSED";
    return e;
  }),
  ...Array(15).fill(null).map(() => {
    const e = new Error("SELECT 타임아웃 (30s 초과)");
    e.name = "DatabaseError";
    e.code = "ETIMEDOUT";
    return e;
  }),
  ...Array(8).fill(null).map(() => {
    const e = new Error("잘못된 JSON 형식");
    e.name = "ValidationError";
    e.statusCode = 400;
    return e;
  }),
  ...Array(3).fill(null).map(() => {
    const e = new Error("Redis 캐시 연결 끊김");
    e.name = "CacheError";
    e.code = "ECONNRESET";
    return e;
  }),
  ...Array(1).fill(null).map(() => {
    const e = new Error("디스크 공간 부족");
    e.name = "SystemError";
    return e;
  }),
];

// 에러 집계
for (const err of simulatedErrors) {
  aggregator.track(err);
}

// 집계 결과 출력
const summary = aggregator.getSummary();
console.log("  에러 집계 결과 (발생 횟수 내림차순):\n");
console.log("  횟수 │ 분류      │ 에러");
console.log("  ─────┼───────────┼────────────────────────────────");

for (const entry of summary) {
  const label = entry.category === "transient" ? "일시적" : "영구적";
  console.log(
    `  ${String(entry.count).padStart(4)} │ ${label.padEnd(7)}  │ [${entry.name}] ${entry.message}`
  );
}

console.log("\n  → 같은 에러를 묶어서 보면 어디가 문제인지 한눈에 보인다");
console.log("  → Sentry, Datadog 같은 도구가 이 방식으로 에러를 그룹핑한다\n");

// ============================================
// 4. 서킷 브레이커 상태 모니터링
// ============================================
console.log("=== 4. 서킷 브레이커 모니터링 ===\n");

// 간단한 서킷 브레이커 (모니터링 기능 포함)
const CB_STATE = { CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" };

class MonitoredCircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = CB_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.lastFailureTime = null;

    // 모니터링 데이터
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.totalRejected = 0; // OPEN 상태에서 거부된 요청
    this.stateHistory = [];
  }

  async execute(fn) {
    this.totalCalls++;

    if (this.state === CB_STATE.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this._transition(CB_STATE.HALF_OPEN);
      } else {
        this.totalRejected++;
        throw new Error(`Circuit ${this.name} OPEN — 요청 거부`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.totalSuccesses++;
    if (this.state === CB_STATE.HALF_OPEN) {
      this._transition(CB_STATE.CLOSED);
      this.failureCount = 0;
    }
    this.successCount++;
  }

  _onFailure() {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CB_STATE.HALF_OPEN) {
      this._transition(CB_STATE.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      this._transition(CB_STATE.OPEN);
    }
  }

  _transition(newState) {
    const prev = this.state;
    this.state = newState;
    this.stateHistory.push({
      from: prev,
      to: newState,
      timestamp: new Date().toISOString(),
    });
  }

  // 모니터링용 메트릭
  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      totalCalls: this.totalCalls,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      totalRejected: this.totalRejected,
      failureRate:
        this.totalCalls > 0
          ? ((this.totalFailures / this.totalCalls) * 100).toFixed(1) + "%"
          : "0%",
      stateTransitions: this.stateHistory.length,
    };
  }
}

// 여러 서비스의 서킷 브레이커를 모니터링
const breakers = {
  payment: new MonitoredCircuitBreaker("payment-service", {
    failureThreshold: 3,
    resetTimeoutMs: 100,
  }),
  inventory: new MonitoredCircuitBreaker("inventory-service", {
    failureThreshold: 5,
    resetTimeoutMs: 100,
  }),
  notification: new MonitoredCircuitBreaker("notification-service", {
    failureThreshold: 3,
    resetTimeoutMs: 100,
  }),
};

// 시뮬레이션
async function simulateService(breaker, successRate, count) {
  for (let i = 0; i < count; i++) {
    try {
      await breaker.execute(async () => {
        if (Math.random() > successRate) {
          throw new Error("서비스 에러");
        }
        return "ok";
      });
    } catch {
      // 에러 무시 (모니터링만 확인)
    }
  }
}

(async () => {
  // 결제 서비스: 장애 발생 (성공률 30%)
  await simulateService(breakers.payment, 0.3, 20);
  // 재고 서비스: 약간 불안정 (성공률 80%)
  await simulateService(breakers.inventory, 0.8, 20);
  // 알림 서비스: 정상 (성공률 98%)
  await simulateService(breakers.notification, 0.98, 20);

  console.log("  서비스별 서킷 브레이커 현황:\n");
  console.log("  서비스                │ 상태      │ 호출   │ 성공   │ 실패   │ 거부   │ 에러율");
  console.log("  ──────────────────────┼───────────┼────────┼────────┼────────┼────────┼──────");

  for (const [, breaker] of Object.entries(breakers)) {
    const m = breaker.getMetrics();
    const stateIcon = m.state === "CLOSED" ? "CLOSED   " : m.state === "OPEN" ? "OPEN     " : "HALF_OPEN";
    console.log(
      `  ${m.name.padEnd(22)}│ ${stateIcon} │ ${String(m.totalCalls).padStart(5)}  │ ${String(m.totalSuccesses).padStart(5)}  │ ${String(m.totalFailures).padStart(5)}  │ ${String(m.totalRejected).padStart(5)}  │ ${m.failureRate}`
    );
  }

  console.log("\n  → payment-service: 에러율 높음, 서킷이 OPEN될 수 있다");
  console.log("  → inventory-service: 약간 불안정하지만 서킷이 열리지 않을 수 있다");
  console.log("  → notification-service: 정상 동작\n");

  // 상태 전이 이력
  console.log("  서킷 브레이커 상태 전이 이력:");
  for (const [name, breaker] of Object.entries(breakers)) {
    if (breaker.stateHistory.length > 0) {
      for (const transition of breaker.stateHistory) {
        console.log(`    [${name}] ${transition.from} → ${transition.to}`);
      }
    }
  }
  console.log();

  // ============================================
  // 5. 대시보드 종합 뷰
  // ============================================
  console.log("=== 5. 모니터링 대시보드 종합 ===\n");

  console.log("  실무에서 대시보드에 표시해야 할 항목들:\n");

  console.log("  ┌─────────────────────────────────────────────────────────┐");
  console.log("  │                    Service Dashboard                    │");
  console.log("  ├─────────────────────────────────────────────────────────┤");
  console.log("  │                                                         │");
  console.log("  │  [요청률]          [에러율]          [레이턴시]          │");
  console.log("  │  1,234 req/s       2.3%              p50: 45ms          │");
  console.log("  │                                      p95: 120ms         │");
  console.log("  │                                      p99: 890ms         │");
  console.log("  │                                                         │");
  console.log("  │  [서킷 브레이커]   [알림]            [의존성]            │");
  console.log("  │  payment: OPEN     에러율 10% 초과    DB: healthy        │");
  console.log("  │  inventory: OK     결제 장애 감지     Redis: healthy     │");
  console.log("  │  notification: OK                    Queue: unhealthy   │");
  console.log("  │                                                         │");
  console.log("  └─────────────────────────────────────────────────────────┘\n");

  console.log("  → Grafana, Datadog 등으로 시각화한다");
  console.log("  → PagerDuty, Slack 연동으로 알림을 보낸다\n");

  // ============================================
  // 핵심 정리
  // ============================================
  console.log("=== 핵심 정리 ===\n");
  console.log("1. 에러를 일시적(transient)과 영구적(permanent)으로 분류하라");
  console.log("   → 일시적 에러만 재시도, 영구적 에러는 즉시 실패");
  console.log("2. 에러율을 시간 윈도우로 측정하고, 임계치 초과 시 알림을 보내라");
  console.log("3. 같은 에러를 핑거프린트로 묶어서 집계하라 (Sentry 방식)");
  console.log("4. 서킷 브레이커 상태(CLOSED/OPEN/HALF_OPEN)를 메트릭으로 노출하라");
  console.log("5. 대시보드에는 요청률, 에러율, 레이턴시, 서킷 상태를 한 화면에 보여라");
})();
