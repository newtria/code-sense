/**
 * Circuit Breaker 패턴 구현 예제
 * 실행: node circuit-breaker.js
 *
 * 외부 서비스가 불안정할 때, 계속 호출하면 전체 시스템이 느려진다.
 * Circuit Breaker는 실패가 누적되면 아예 호출을 차단(fast-fail)하여
 * 시스템을 보호한다.
 *
 * 상태 전이: CLOSED → OPEN → HALF_OPEN → CLOSED (또는 다시 OPEN)
 */

// ============================================
// 불안정한 외부 서비스 시뮬레이션
// ============================================
class UnstableService {
  constructor() {
    this.callCount = 0;
    this.failFrom = 4;   // 4번째 호출부터 실패 시작
    this.recoverAt = 8;   // 8번째 호출부터 복구
  }

  async call(requestId) {
    this.callCount++;
    // 네트워크 지연 시뮬레이션
    await new Promise((r) => setTimeout(r, 30));

    if (this.callCount >= this.failFrom && this.callCount < this.recoverAt) {
      throw new Error(`서비스 장애 (내부 호출 #${this.callCount})`);
    }
    return `응답 성공 (요청 ${requestId})`;
  }
}

// ============================================
// Circuit Breaker 구현
// ============================================
const STATE = {
  CLOSED: "CLOSED",       // 정상 — 요청을 그대로 전달
  OPEN: "OPEN",           // 차단 — 요청을 보내지 않고 즉시 실패
  HALF_OPEN: "HALF_OPEN", // 시험 — 하나만 보내서 복구 확인
};

class CircuitBreaker {
  constructor(options = {}) {
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = options.failureThreshold || 3;  // 연속 실패 N회 → OPEN
    this.resetTimeoutMs = options.resetTimeoutMs || 200;     // OPEN 유지 시간
    this.halfOpenMax = options.halfOpenMax || 1;             // HALF_OPEN에서 시험 요청 수
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  async execute(fn) {
    // OPEN 상태: 호출하지 않고 즉시 실패
    if (this.state === STATE.OPEN) {
      // 타임아웃 경과했으면 HALF_OPEN 전환
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this._transition(STATE.HALF_OPEN);
        this.halfOpenAttempts = 0;
      } else {
        throw new Error("Circuit OPEN — 서비스 호출 차단 (fast-fail)");
      }
    }

    // HALF_OPEN 상태: 시험 요청 수 초과 시 차단
    if (this.state === STATE.HALF_OPEN && this.halfOpenAttempts >= this.halfOpenMax) {
      throw new Error("Circuit HALF_OPEN — 시험 요청 대기 중 (fast-fail)");
    }

    try {
      if (this.state === STATE.HALF_OPEN) {
        this.halfOpenAttempts++;
      }

      const result = await fn();

      // 성공 처리
      this._onSuccess();
      return result;
    } catch (err) {
      // 실패 처리
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    if (this.state === STATE.HALF_OPEN) {
      // HALF_OPEN에서 성공 → 복구 확인, CLOSED로 전환
      this._transition(STATE.CLOSED);
      this.failureCount = 0;
    }
    this.successCount++;
  }

  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === STATE.HALF_OPEN) {
      // HALF_OPEN에서 실패 → 아직 복구 안 됨, 다시 OPEN
      this._transition(STATE.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      // CLOSED에서 임계치 초과 → OPEN
      this._transition(STATE.OPEN);
    }
  }

  _transition(newState) {
    const prev = this.state;
    this.state = newState;
    console.log(`  [상태 전이] ${prev} → ${newState}`);
  }
}

// ============================================
// 1. Circuit Breaker 없이 호출 (문제 상황)
// ============================================
async function withoutCircuitBreaker() {
  console.log("=== 1. Circuit Breaker 없이 호출 ===\n");
  console.log("불안정한 서비스에 10번 연속 요청을 보낸다.\n");

  const service = new UnstableService();

  for (let i = 1; i <= 10; i++) {
    const start = Date.now();
    try {
      const result = await service.call(i);
      const elapsed = Date.now() - start;
      console.log(`  요청 ${String(i).padStart(2)}: ${result} (${elapsed}ms)`);
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`  요청 ${String(i).padStart(2)}: 실패 — ${err.message} (${elapsed}ms 낭비)`);
    }
  }

  console.log("\n문제점:");
  console.log("  - 장애 중에도 매번 30ms씩 기다린 후 실패");
  console.log("  - 실패할 걸 알면서도 계속 호출 → 시간 낭비, 서비스에 부하 가중");
  console.log("  - 장애가 전파되어 우리 서버도 느려짐 (cascading failure)\n");
}

// ============================================
// 2. Circuit Breaker 적용 (해결)
// ============================================
async function withCircuitBreaker() {
  console.log("=== 2. Circuit Breaker 적용 ===\n");
  console.log("실패 3회 누적 → OPEN(차단) → 200ms 후 HALF_OPEN(시험) → 성공 시 CLOSED(복구)\n");

  const service = new UnstableService();
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 200,
    halfOpenMax: 1,
  });

  let reqNum = 1;

  async function sendRequest() {
    const i = reqNum++;
    const start = Date.now();
    try {
      const result = await breaker.execute(() => service.call(i));
      const elapsed = Date.now() - start;
      console.log(`  요청 ${String(i).padStart(2)}: ${result} (${elapsed}ms) [${breaker.state}]`);
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`  요청 ${String(i).padStart(2)}: ${err.message} (${elapsed}ms) [${breaker.state}]`);
    }
  }

  // Phase 1: 정상 요청 → 실패 누적 → OPEN
  // 서비스 callCount: 1(성공), 2(성공), 3(성공), 4(실패), 5(실패), 6(실패→OPEN)
  for (let i = 0; i < 8; i++) await sendRequest();

  // Phase 2: OPEN 타임아웃 후 HALF_OPEN → 시험 실패 → 다시 OPEN
  console.log("\n  (200ms 대기 — HALF_OPEN 전환 시도, 서비스 아직 장애 중...)\n");
  await new Promise((r) => setTimeout(r, 250));
  // 서비스 callCount: 7(실패→다시 OPEN)
  for (let i = 0; i < 3; i++) await sendRequest();

  // Phase 3: 다시 OPEN 타임아웃 후 HALF_OPEN → 서비스 복구됨 → CLOSED!
  console.log("\n  (200ms 대기 — 서비스 복구 후 HALF_OPEN 재시도...)\n");
  await new Promise((r) => setTimeout(r, 250));
  // 서비스 callCount: 8(성공→CLOSED!)
  for (let i = 0; i < 3; i++) await sendRequest();

  console.log();
}

// ============================================
// 실행
// ============================================
async function main() {
  console.log("=== Circuit Breaker 패턴 데모 ===\n");

  await withoutCircuitBreaker();
  await withCircuitBreaker();

  console.log("=== 핵심 정리 ===\n");
  console.log("상태 전이:");
  console.log("  CLOSED (정상)  → 실패 누적 시 → OPEN (차단)");
  console.log("  OPEN (차단)    → 타임아웃 후  → HALF_OPEN (시험)");
  console.log("  HALF_OPEN      → 시험 성공    → CLOSED (복구)");
  console.log("  HALF_OPEN      → 시험 실패    → OPEN (다시 차단)\n");

  console.log("Circuit Breaker 없이:");
  console.log("  - 장애 중에도 매번 네트워크 대기 → 시간 낭비");
  console.log("  - 장애 서비스에 계속 부하 → 복구 방해");
  console.log("  - 우리 서버까지 느려짐 (cascading failure)\n");

  console.log("Circuit Breaker 적용 시:");
  console.log("  - OPEN 상태에서 즉시 실패 (0ms) → 빠른 응답");
  console.log("  - 장애 서비스에 요청 안 보냄 → 복구 시간 확보");
  console.log("  - HALF_OPEN으로 자동 복구 감지\n");

  console.log("실무 적용:");
  console.log("  - Netflix Hystrix, resilience4j 등 라이브러리 사용");
  console.log("  - MSA에서 서비스 간 호출 시 필수 패턴");
  console.log("  - fallback 응답 (캐시된 값, 기본값) 과 함께 사용");
}

main();
