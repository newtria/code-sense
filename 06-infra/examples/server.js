/**
 * 서비스 오케스트레이션 패턴 데모 서버
 * 실행: node server.js
 *
 * docker-compose.yml의 Postgres/Redis와 함께 동작하는 서버 패턴을 보여준다.
 * 실제 드라이버(pg, ioredis)는 zero-dependency 규칙에 따라 사용하지 않고,
 * 연결 패턴을 시뮬레이션한다. 주석으로 실제 구현 방법을 안내한다.
 *
 * 다루는 주제:
 *   1. 구조화된 로깅 (JSON 형식)
 *   2. 환경변수 설정 (기본값 포함)
 *   3. 서비스 의존성 헬스체크
 *   4. Graceful Shutdown (SIGTERM/SIGINT)
 */

const http = require("http");

// ============================================
// 1. 환경변수 설정 (기본값 포함)
// ============================================
// 하드코딩 대신 환경변수를 사용해야 환경(개발/스테이징/프로덕션)별 설정이 가능하다.
// docker-compose.yml의 environment 섹션에서 주입된다.
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL || "postgres://user:password@localhost:5432/mydb",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
};

// ============================================
// 2. 구조화된 로깅 (JSON)
// ============================================
// console.log("서버 시작") 대신 구조화된 로그를 사용해야 하는 이유:
//   - 로그 수집기(ELK, Datadog)가 JSON을 파싱할 수 있다
//   - 검색, 필터링, 알림 설정이 가능하다
//   - 타임스탬프, 레벨, 컨텍스트가 일관되게 포함된다
//
// 실무에서는 winston, pino 등 로깅 라이브러리를 사용한다.
// 여기서는 zero-dependency 규칙에 따라 직접 구현한다.

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLogLevel =
  config.nodeEnv === "production" ? LOG_LEVELS.info : LOG_LEVELS.debug;

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > currentLogLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    env: config.nodeEnv,
    ...meta,
  };

  // 프로덕션에서는 JSON 한 줄, 개발에서도 동일 포맷 유지
  const output = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(output + "\n");
  } else {
    process.stdout.write(output + "\n");
  }
}

// ============================================
// 3. 서비스 의존성 연결 시뮬레이션
// ============================================
// 실제 구현에서 사용할 패키지:
//   - PostgreSQL: pg (node-postgres) → const { Pool } = require('pg')
//   - Redis: ioredis → const Redis = require('ioredis')
//
// 여기서는 연결 패턴만 보여주고, 실제 네트워크 연결은 하지 않는다.

const dependencies = {
  postgres: {
    status: "disconnected",
    url: config.databaseUrl,
    // 실제 구현:
    // const pool = new Pool({ connectionString: config.databaseUrl });
    // await pool.query('SELECT 1');
  },
  redis: {
    status: "disconnected",
    url: config.redisUrl,
    // 실제 구현:
    // const redis = new Redis(config.redisUrl);
    // await redis.ping();
  },
};

function simulateConnection(serviceName) {
  return new Promise((resolve) => {
    // 실제로는 TCP 연결을 시도하고 응답을 확인한다
    // 여기서는 시뮬레이션을 위해 즉시 성공으로 처리
    dependencies[serviceName].status = "connected";
    log("info", `${serviceName} 연결 성공 (시뮬레이션)`, {
      service: serviceName,
      url: dependencies[serviceName].url.replace(
        /\/\/.*@/,
        "//***:***@" // 로그에 비밀번호 노출 방지
      ),
    });
    resolve();
  });
}

async function connectAll() {
  log("info", "서비스 의존성 연결 시작...");
  await simulateConnection("postgres");
  await simulateConnection("redis");
  log("info", "모든 서비스 연결 완료");
}

// ============================================
// 4. HTTP 서버 + 헬스체크 엔드포인트
// ============================================
const startTime = Date.now();

const server = http.createServer((req, res) => {
  const requestId = Math.random().toString(36).substring(2, 10);
  const start = Date.now();

  // 요청 로깅
  log("info", "요청 수신", {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
  });

  // 헬스체크 엔드포인트 — 로드밸런서/오케스트레이터가 상태 확인
  // Kubernetes의 livenessProbe, readinessProbe가 이 엔드포인트를 호출한다.
  if (req.url === "/health") {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    // 모든 의존성의 상태를 확인
    const pgHealthy = dependencies.postgres.status === "connected";
    const redisHealthy = dependencies.redis.status === "connected";
    const allHealthy = pgHealthy && redisHealthy;

    const healthResponse = {
      status: allHealthy ? "ok" : "degraded",
      uptime: `${uptimeSeconds}s`,
      timestamp: new Date().toISOString(),
      checks: {
        postgres: {
          status: pgHealthy ? "ok" : "error",
          // 실제 구현: await pool.query('SELECT 1') 결과
        },
        redis: {
          status: redisHealthy ? "ok" : "error",
          // 실제 구현: await redis.ping() 결과
        },
      },
    };

    const statusCode = allHealthy ? 200 : 503;
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(healthResponse, null, 2));

    log("info", "헬스체크 응답", {
      requestId,
      statusCode,
      healthy: allHealthy,
      duration: `${Date.now() - start}ms`,
    });
    return;
  }

  // 메인 엔드포인트
  if (req.url === "/") {
    const response = {
      message: "CS Fundamentals 데모 서버",
      환경: config.nodeEnv,
      endpoints: [
        { path: "/", description: "서버 정보" },
        { path: "/health", description: "헬스체크 (의존성 상태 포함)" },
      ],
      의존성: {
        postgres: dependencies.postgres.status,
        redis: dependencies.redis.status,
      },
    };

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(response, null, 2));

    log("info", "응답 전송", {
      requestId,
      statusCode: 200,
      duration: `${Date.now() - start}ms`,
    });
    return;
  }

  // 404 처리
  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Not Found", path: req.url }));

  log("warn", "존재하지 않는 경로 요청", {
    requestId,
    statusCode: 404,
    url: req.url,
    duration: `${Date.now() - start}ms`,
  });
});

// ============================================
// 5. Graceful Shutdown — 안전한 종료
// ============================================
// Docker/Kubernetes가 컨테이너를 종료할 때:
//   1. SIGTERM 신호를 보낸다
//   2. 앱이 정리 작업(DB 연결 닫기, 진행중 요청 완료)을 수행한다
//   3. 일정 시간(기본 30초) 후에도 종료되지 않으면 SIGKILL로 강제 종료한다
//
// Graceful Shutdown이 없으면:
//   - 진행 중인 요청이 중단된다 (사용자에게 에러 발생)
//   - DB 트랜잭션이 롤백되지 않을 수 있다
//   - 리소스 누수(메모리, 파일 핸들)가 발생할 수 있다

let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return; // 중복 호출 방지
  isShuttingDown = true;

  log("info", `${signal} 수신. 안전한 종료를 시작합니다...`, { signal });

  // 새로운 요청을 거부하는 것은 server.close()가 처리한다
  // 진행 중인 요청이 끝나길 기다리되, 타임아웃 시 강제 종료
  const forceTimeout = setTimeout(() => {
    log("error", "타임아웃 초과. 강제 종료합니다.", { signal });
    process.exit(1);
  }, 10000);

  server.close(() => {
    clearTimeout(forceTimeout);

    // 의존성 연결 정리
    log("info", "DB/Redis 연결 종료 중... (시뮬레이션)");
    // 실제 구현:
    //   await pool.end();       // PostgreSQL 연결 풀 종료
    //   await redis.quit();     // Redis 연결 종료

    dependencies.postgres.status = "disconnected";
    dependencies.redis.status = "disconnected";

    log("info", "서버가 안전하게 종료되었습니다.");
    process.exit(0);
  });
}

// SIGTERM: Docker/Kubernetes가 보내는 종료 신호
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
// SIGINT: Ctrl+C (개발 환경에서 수동 종료)
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================
// 6. 서버 시작
// ============================================
async function startServer() {
  log("info", "서버 설정", {
    port: config.port,
    nodeEnv: config.nodeEnv,
  });

  // 의존성 연결
  await connectAll();

  // 서버 시작
  server.listen(config.port, () => {
    log("info", `서버 시작 완료`, {
      port: config.port,
      healthCheck: `http://localhost:${config.port}/health`,
    });

    // 데모 모드: 자동 실행 후 종료 (node server.js로 실행 시)
    if (!process.env.KEEP_RUNNING) {
      runDemo();
    }
  });
}

// ============================================
// 데모: 서버 기능을 자동으로 테스트하고 종료
// ============================================
function runDemo() {
  console.log("\n--- 데모 시작 ---\n");

  // 메인 페이지 요청
  http.get(`http://localhost:${config.port}/`, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log("=== GET / 응답 ===");
      console.log(data);
      console.log();

      // 헬스체크 요청
      http.get(`http://localhost:${config.port}/health`, (healthRes) => {
        let healthData = "";
        healthRes.on("data", (chunk) => (healthData += chunk));
        healthRes.on("end", () => {
          console.log("=== GET /health 응답 ===");
          console.log(healthData);
          console.log();

          // 404 요청
          http.get(
            `http://localhost:${config.port}/nonexistent`,
            (notFoundRes) => {
              let notFoundData = "";
              notFoundRes.on("data", (chunk) => (notFoundData += chunk));
              notFoundRes.on("end", () => {
                console.log("=== GET /nonexistent 응답 (404) ===");
                console.log(notFoundData);
                console.log();

                console.log("--- 데모 완료. 서버를 종료합니다. ---\n");

                console.log("=== 핵심 정리 ===");
                console.log(
                  "1. 구조화된 로깅: console.log 대신 JSON 형식으로 출력하라"
                );
                console.log(
                  "   → 로그 수집기(ELK, Datadog)가 자동으로 파싱할 수 있다"
                );
                console.log(
                  "2. 환경변수: 설정값을 코드에 하드코딩하지 마라"
                );
                console.log(
                  "   → 환경별(개발/스테이징/프로덕션) 설정을 외부에서 주입"
                );
                console.log(
                  "3. 헬스체크: /health 엔드포인트로 모든 의존성 상태를 확인하라"
                );
                console.log(
                  "   → Kubernetes livenessProbe/readinessProbe에서 사용"
                );
                console.log(
                  "4. Graceful Shutdown: SIGTERM 시 진행중인 요청을 완료 후 종료하라"
                );
                console.log(
                  "   → DB 연결, 파일 핸들 등 리소스를 정리해야 한다"
                );

                // 서버 종료
                gracefulShutdown("DEMO_COMPLETE");
              });
            }
          );
        });
      });
    });
  });
}

startServer();
