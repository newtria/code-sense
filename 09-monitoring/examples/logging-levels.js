/**
 * 구조화된 로깅(Structured Logging)과 로그 레벨 데모
 * 실행: node logging-levels.js
 *
 * console.log가 프로덕션에서 왜 부족한지,
 * 구조화된 JSON 로깅이 왜 필요한지 이해한다.
 * 외부 의존성 없이 구현한다.
 */

const { randomUUID } = require("crypto");

// ============================================
// 1. console.log의 한계
// ============================================
console.log("=== 1. console.log의 한계 ===\n");

console.log("프로덕션에서 console.log를 쓰면 생기는 문제들:\n");

// 나쁜 예: console.log
console.log("  나쁜 예 — console.log:");
console.log("  console.log('유저 로그인:', username);");
console.log("  console.log('DB 쿼리 실행');");
console.log("  console.log('에러 발생:', err);\n");

console.log("  문제점:");
console.log("  1. 로그 레벨이 없다 → 에러와 디버그 로그가 섞인다");
console.log("  2. 타임스탬프가 없다 → 언제 발생했는지 모른다");
console.log("  3. 구조가 없다 → grep/파싱이 어렵다");
console.log("  4. 컨텍스트가 없다 → 어떤 요청에서 발생했는지 추적 불가");
console.log("  5. 출력 제어가 안 된다 → 프로덕션에서 디버그 로그가 쏟아진다\n");

// ============================================
// 2. 로그 레벨 정의
// ============================================
console.log("=== 2. 로그 레벨 시스템 ===\n");

// 로그 레벨 정의 (숫자가 클수록 심각)
const LOG_LEVELS = {
  DEBUG: 0,   // 개발 중 디버깅 정보 (프로덕션에서는 끈다)
  INFO: 1,    // 정상 동작 기록 (유저 로그인, API 호출 등)
  WARN: 2,    // 주의가 필요한 상황 (디스크 80%, 재시도 발생 등)
  ERROR: 3,   // 에러 발생, 서비스는 계속 동작
  FATAL: 4,   // 서비스 중단이 필요한 치명적 에러
};

console.log("  레벨  │ 숫자 │ 용도                              │ 프로덕션");
console.log("  ──────┼──────┼───────────────────────────────────┼────────");
console.log("  DEBUG │  0   │ 디버깅 (변수값, 흐름 추적)        │ OFF");
console.log("  INFO  │  1   │ 정상 동작 (로그인, 요청 완료)     │ ON");
console.log("  WARN  │  2   │ 주의 (디스크 부족, 느린 쿼리)     │ ON");
console.log("  ERROR │  3   │ 에러 (요청 실패, 외부 서비스 장애) │ ON");
console.log("  FATAL │  4   │ 치명적 (DB 연결 불가, OOM)        │ ON + 알림");
console.log();

// ============================================
// 3. 구조화된 로거 구현
// ============================================
console.log("=== 3. 구조화된 로거 구현 ===\n");

class StructuredLogger {
  /**
   * @param {Object} options
   * @param {string} options.service - 서비스 이름
   * @param {string} options.level - 최소 로그 레벨 (이 레벨 이상만 출력)
   * @param {boolean} options.pretty - 사람이 읽기 쉬운 형식으로 출력 (데모용)
   */
  constructor(options = {}) {
    this.service = options.service || "app";
    this.minLevel = LOG_LEVELS[options.level] ?? LOG_LEVELS.INFO;
    this.pretty = options.pretty ?? false;
  }

  // 핵심: 모든 로그를 JSON 형식으로 출력
  _log(level, message, meta = {}) {
    const levelNum = LOG_LEVELS[level];

    // 설정된 최소 레벨보다 낮은 로그는 무시
    if (levelNum < this.minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...meta,
    };

    // 프로덕션에서는 JSON 한 줄로 출력 (로그 수집기가 파싱하기 좋다)
    // 데모에서는 보기 쉽게 출력
    const output = this.pretty
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    // ERROR 이상은 stderr, 나머지는 stdout
    if (levelNum >= LOG_LEVELS.ERROR) {
      process.stderr.write(output + "\n");
    } else {
      process.stdout.write(output + "\n");
    }
  }

  debug(message, meta) { this._log("DEBUG", message, meta); }
  info(message, meta) { this._log("INFO", message, meta); }
  warn(message, meta) { this._log("WARN", message, meta); }
  error(message, meta) { this._log("ERROR", message, meta); }
  fatal(message, meta) { this._log("FATAL", message, meta); }

  // 특정 요청에 대한 자식 로거 생성 (컨텍스트 전파)
  child(context) {
    const childLogger = new StructuredLogger({
      service: this.service,
      level: Object.keys(LOG_LEVELS).find((k) => LOG_LEVELS[k] === this.minLevel),
      pretty: this.pretty,
    });
    // 자식 로거의 _log를 오버라이드하여 컨텍스트를 자동 포함
    const originalLog = childLogger._log.bind(childLogger);
    childLogger._log = (level, message, meta = {}) => {
      originalLog(level, message, { ...context, ...meta });
    };
    return childLogger;
  }
}

// 로거 생성 (프로덕션: level="INFO", 개발: level="DEBUG")
const logger = new StructuredLogger({
  service: "user-api",
  level: "DEBUG", // 데모를 위해 DEBUG부터 출력
});

console.log("모든 레벨의 로그 출력:\n");

logger.debug("캐시 조회 시도", { key: "user:123", cache: "memory" });
logger.info("유저 로그인 성공", { userId: 123, method: "jwt" });
logger.warn("느린 쿼리 감지", { query: "SELECT * FROM orders", durationMs: 3200 });
logger.error("외부 API 호출 실패", { url: "https://payment.api/charge", statusCode: 503, retryCount: 2 });
logger.fatal("데이터베이스 연결 끊김", { host: "db-primary.internal", error: "ECONNREFUSED" });

console.log();

// ============================================
// 4. 레벨 필터링 데모
// ============================================
console.log("=== 4. 레벨 필터링 ===\n");

console.log("프로덕션 로거 (INFO 이상만 출력):\n");

const prodLogger = new StructuredLogger({
  service: "user-api",
  level: "INFO", // DEBUG는 무시됨
});

prodLogger.debug("이 로그는 출력되지 않는다", { detail: "debug-only" });
prodLogger.info("이 로그는 출력된다", { action: "startup" });
prodLogger.warn("이 경고도 출력된다", { disk_usage: "82%" });

console.log("\n  → DEBUG 로그가 필터링되어 프로덕션 로그 노이즈가 줄어든다\n");

// ============================================
// 5. 컨텍스트 전파 (Request ID / Correlation ID)
// ============================================
console.log("=== 5. 컨텍스트 전파 (Request ID) ===\n");

console.log("분산 시스템에서 하나의 요청이 여러 서비스를 거칠 때,");
console.log("Request ID로 전체 흐름을 추적한다.\n");

// 요청별 로거 생성
const requestId = randomUUID();
const userId = 42;

const reqLogger = logger.child({
  requestId,
  userId,
  path: "/api/orders",
  method: "POST",
});

console.log(`요청 시뮬레이션 (requestId: ${requestId.slice(0, 8)}...):\n`);

reqLogger.info("요청 수신");
reqLogger.debug("요청 본문 파싱 완료", { bodySize: 256 });
reqLogger.info("주문 생성 시작", { productId: "PROD-001", quantity: 2 });
reqLogger.warn("재고 부족 경고", { productId: "PROD-001", remaining: 3 });
reqLogger.info("주문 생성 완료", { orderId: "ORD-20240315-001", totalPrice: 59000 });
reqLogger.info("응답 전송", { statusCode: 201, durationMs: 145 });

console.log();
console.log("  → 모든 로그에 requestId, userId가 자동 포함된다");
console.log("  → 로그 검색: requestId로 필터링하면 요청의 전체 흐름을 추적 가능\n");

// ============================================
// 6. 실무에서의 로깅 패턴
// ============================================
console.log("=== 6. 실무 로깅 패턴 ===\n");

// 패턴 1: HTTP 요청/응답 로깅
console.log("패턴 1 — HTTP 요청/응답 로깅 (미들웨어):\n");

function simulateHttpLog(method, path, statusCode, durationMs) {
  const httpLogger = logger.child({ requestId: randomUUID().slice(0, 8) });
  httpLogger.info("HTTP 요청 완료", {
    method,
    path,
    statusCode,
    durationMs,
    // 느린 요청은 WARN으로 올릴 수도 있다
  });
}

simulateHttpLog("GET", "/api/users", 200, 45);
simulateHttpLog("POST", "/api/orders", 201, 320);
simulateHttpLog("GET", "/api/products/999", 404, 12);

console.log();

// 패턴 2: 에러 로깅 시 주의사항
console.log("패턴 2 — 에러 로깅 주의사항:\n");

console.log("  나쁜 예:");
console.log('  logger.error(err)              // → 에러 객체만 덩그러니');
console.log('  logger.error(err.message)      // → 스택 트레이스 유실\n');

console.log("  좋은 예:");
console.log('  logger.error("결제 처리 실패", {');
console.log("    error: err.message,");
console.log("    stack: err.stack,            // 스택은 로그에만 남기고");
console.log("    orderId: order.id,           // 관련 컨텍스트 포함");
console.log("    userId: user.id,");
console.log("  });\n");

// ============================================
// 핵심 정리
// ============================================
console.log("=== 핵심 정리 ===\n");
console.log("1. console.log 대신 구조화된 로거를 사용하라 (JSON 형식)");
console.log("2. 로그 레벨로 노이즈를 제어하라 (프로덕션에서는 INFO 이상)");
console.log("3. 모든 요청에 Request ID를 부여하고 로그에 포함하라");
console.log("4. child 로거로 컨텍스트를 자동 전파하라");
console.log("5. 에러 로깅 시 메시지 + 스택 + 관련 컨텍스트를 함께 남겨라");
console.log("6. 실무에서는 winston, pino 등 전용 라이브러리를 사용한다");
console.log("   (이 예제는 원리 이해를 위해 직접 구현한 것)");
