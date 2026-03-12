/**
 * 프로세스 레벨 에러 핸들러 데모
 * 실행: node global-handlers-demo.js
 *
 * 프로세스 전체에서 놓친 에러를 잡는 안전망을 이해한다.
 * process.on('unhandledRejection')과 process.on('uncaughtException')의
 * 동작 원리와 올바른 사용법을 배운다.
 * 외부 의존성 없이 구현한다.
 */

// ============================================
// 1. 핸들러 없이 에러가 발생하면? (나쁜 방식)
// ============================================
console.log("=== 프로세스 레벨 에러 핸들러 데모 ===\n");

console.log("--- 1단계: 핸들러 없이 에러가 발생하면? ---\n");

console.log("나쁜 방식 — 글로벌 핸들러 없이 unhandled rejection:");
console.log("  async function fetchData() {");
console.log("    throw new Error('API 서버 다운');");
console.log("  }");
console.log("  fetchData(); // await도 .catch()도 없다");
console.log("");
console.log("  결과:");
console.log("  - Node.js 16+: UnhandledPromiseRejectionWarning 후 프로세스 종료");
console.log("  - 에러 로그가 stderr에만 출력 — 모니터링 시스템이 못 잡을 수 있다");
console.log("  - DB 연결, 파일 핸들 등이 정리되지 않은 채 종료\n");

console.log("나쁜 방식 — 동기 코드에서 잡지 못한 에러:");
console.log("  function processData(data) {");
console.log("    return data.items.map(i => i.name); // data가 null이면?");
console.log("  }");
console.log("  processData(null); // TypeError: Cannot read properties of null");
console.log("");
console.log("  결과:");
console.log("  - 스택 트레이스가 출력되고 프로세스 즉시 종료");
console.log("  - 다른 요청들도 함께 죽는다 (서버 전체 다운)\n");

// ============================================
// 2. 글로벌 핸들러 설정 (올바른 방식)
// ============================================

console.log("--- 2단계: 글로벌 핸들러 설정 (올바른 방식) ---\n");

// 정리 작업 시뮬레이션
const resources = {
  dbConnection: { connected: true },
  fileHandles: ["log.txt", "data.csv"],
  activeTimers: [],
};

function gracefulCleanup(source) {
  console.log(`    [정리] ${source}에서 호출됨`);
  if (resources.dbConnection.connected) {
    resources.dbConnection.connected = false;
    console.log("    [정리] DB 연결 종료");
  }
  if (resources.fileHandles.length > 0) {
    console.log(`    [정리] 파일 핸들 ${resources.fileHandles.length}개 닫기`);
    resources.fileHandles = [];
  }
  resources.activeTimers.forEach((t) => clearTimeout(t));
  console.log("    [정리] 타이머 정리 완료");
}

// 에러 로깅 시뮬레이션 (실제로는 파일 또는 모니터링 서비스에 기록)
const errorLog = [];
function logError(type, error) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    name: error.name || "Error",
    message: error.message,
    stack: error.stack ? error.stack.split("\n").slice(0, 3).join("\n") : "N/A",
  };
  errorLog.push(entry);
  console.log(`    [로그] ${type}: ${error.name || "Error"} — ${error.message}`);
}

// ============================================
// 3. unhandledRejection 핸들러
// ============================================

console.log("  (1) unhandledRejection — 처리되지 않은 Promise 거부\n");
console.log("  Promise에 .catch()나 try/catch(await)가 없을 때 발동한다.\n");

// 핸들러 등록
process.on("unhandledRejection", (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError("UnhandledRejection", error);
  // 중요: unhandledRejection은 복구 가능할 수도 있지만,
  // 프로덕션에서는 로그 후 종료하는 것이 안전하다.
});

// 테스트: 의도적으로 unhandled rejection 발생
console.log("  테스트: .catch() 없는 Promise.reject() 실행...");
Promise.reject(new Error("DB 연결 실패 — .catch() 없이 방치된 Promise"));

// reject가 처리될 시간을 준 후 다음 단계로
setTimeout(() => {
  console.log("    → 핸들러가 에러를 포착하고 로그를 기록했다\n");

  // ============================================
  // 4. uncaughtException 핸들러
  // ============================================

  console.log("  (2) uncaughtException — 잡히지 않은 동기 에러\n");
  console.log("  try/catch 없이 throw된 에러가 콜스택 최상위까지 올라갈 때 발동한다.\n");

  // 중요: uncaughtException 핸들러에서는 상태를 신뢰할 수 없다.
  // 로그를 기록하고, 정리하고, 반드시 프로세스를 종료해야 한다.
  let uncaughtExceptionHandled = false;

  process.on("uncaughtException", (error, origin) => {
    if (uncaughtExceptionHandled) return; // 중복 방지
    uncaughtExceptionHandled = true;

    logError("UncaughtException", error);
    console.log(`    origin: ${origin}`);
    gracefulCleanup("uncaughtException");

    // 프로덕션에서는 반드시 종료해야 한다:
    // process.exit(1);
    // 이 데모에서는 학습을 위해 계속 진행한다.
  });

  // 테스트: 의도적으로 uncaughtException 발생
  // 주의: setTimeout 내부에서 throw하면 이벤트 루프가 잡지 못해 uncaughtException이 된다
  console.log("  테스트: setTimeout 내부에서 잡지 않은 throw 실행...");

  setTimeout(() => {
    try {
      // 실제로 throw하면 프로세스가 위험해질 수 있으므로
      // 핸들러를 직접 트리거하는 방식으로 시뮬레이션
      const simulatedError = new TypeError("Cannot read properties of null (reading 'name')");
      process.emit("uncaughtException", simulatedError, "uncaughtException");
    } catch (_) {
      // 안전망
    }

    setTimeout(() => {
      console.log("    → 핸들러가 에러를 포착하고 정리 작업을 수행했다\n");

      // ============================================
      // 5. 복구 가능 vs 불가능 에러
      // ============================================

      console.log("--- 3단계: 복구 가능 vs 불가능 에러 ---\n");

      console.log("  ┌──────────────────────┬──────────┬──────────────────────────────┐");
      console.log("  │ 에러 유형             │ 복구?    │ 대응 방법                    │");
      console.log("  ├──────────────────────┼──────────┼──────────────────────────────┤");
      console.log("  │ ValidationError      │ O 복구   │ 사용자에게 오류 메시지 반환   │");
      console.log("  │ NotFoundError        │ O 복구   │ 404 응답 반환                │");
      console.log("  │ RateLimitError       │ O 복구   │ 잠시 후 재시도               │");
      console.log("  │ NetworkError (일시적) │ O 복구   │ 재시도 + 백오프              │");
      console.log("  ├──────────────────────┼──────────┼──────────────────────────────┤");
      console.log("  │ OutOfMemory          │ X 불가   │ 로그 후 프로세스 재시작       │");
      console.log("  │ TypeError (버그)     │ X 불가   │ 로그 후 프로세스 재시작       │");
      console.log("  │ StackOverflow        │ X 불가   │ 로그 후 프로세스 재시작       │");
      console.log("  │ 손상된 상태           │ X 불가   │ 로그 후 프로세스 재시작       │");
      console.log("  └──────────────────────┴──────────┴──────────────────────────────┘\n");

      console.log("  핵심: uncaughtException은 '복구 불가능'이다.");
      console.log("  → 상태가 이미 손상되었을 수 있으므로 로그만 남기고 프로세스를 종료하라.");
      console.log("  → PM2, systemd, Docker restart policy 등으로 자동 재시작되게 하라.\n");

      console.log("  반면: unhandledRejection은 '복구 가능할 수도' 있다.");
      console.log("  → 하지만 어떤 Promise가 실패했는지 모르면 상태를 보장할 수 없다.");
      console.log("  → 프로덕션에서는 역시 로그 후 종료가 안전하다.\n");

      // ============================================
      // 6. 올바른 패턴 정리
      // ============================================

      console.log("--- 4단계: 프로덕션 환경의 올바른 패턴 ---\n");

      console.log("  // 프로덕션 코드 예시:");
      console.log("  process.on('unhandledRejection', (reason, promise) => {");
      console.log("    logger.error('Unhandled Rejection:', reason);");
      console.log("    // 메트릭 카운터 증가 (모니터링)");
      console.log("    metrics.increment('unhandled_rejection');");
      console.log("    // 프로세스 종료 → PM2가 자동 재시작");
      console.log("    process.exit(1);");
      console.log("  });\n");

      console.log("  process.on('uncaughtException', (error, origin) => {");
      console.log("    logger.fatal('Uncaught Exception:', error);");
      console.log("    // 동기적으로 로그 flush");
      console.log("    logger.flushSync();");
      console.log("    // 정리 작업 (동기만 가능!)");
      console.log("    closeDbSync();");
      console.log("    // 반드시 종료 — 상태를 신뢰할 수 없다");
      console.log("    process.exit(1);");
      console.log("  });\n");

      console.log("  // SIGTERM (컨테이너 종료, 배포 시):");
      console.log("  process.on('SIGTERM', () => {");
      console.log("    logger.info('SIGTERM 수신 — 정상 종료 시작');");
      console.log("    server.close(() => {");
      console.log("      closeDb().then(() => process.exit(0));");
      console.log("    });");
      console.log("  });\n");

      // ============================================
      // 7. 에러 로그 확인
      // ============================================

      console.log("--- 기록된 에러 로그 ---\n");
      for (const entry of errorLog) {
        console.log(`  [${entry.type}] ${entry.name}: ${entry.message}`);
      }

      // ============================================
      // 핵심 정리
      // ============================================
      console.log(`\n${"=".repeat(40)}`);
      console.log("핵심 정리:");
      console.log("1. unhandledRejection: await나 .catch() 없는 Promise 에러를 잡는다");
      console.log("2. uncaughtException: try/catch 없이 throw된 에러를 잡는다");
      console.log("3. 두 핸들러 모두 '안전망'이다 — 이것에 의존하지 말고 코드에서 에러를 처리하라");
      console.log("4. uncaughtException 후에는 반드시 프로세스를 종료하라 (상태 손상 위험)");
      console.log("5. PM2/Docker/systemd로 자동 재시작 설정을 반드시 하라");
      console.log("6. SIGTERM 핸들러로 graceful shutdown을 구현하라");

      // 프로세스가 깔끔하게 종료되도록
      process.exit(0);
    }, 50);
  }, 50);
}, 100);
