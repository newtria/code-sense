/**
 * CORS (Cross-Origin Resource Sharing) 데모
 * 실행: node cors-demo.js
 *
 * Node.js 내장 http 모듈만 사용.
 * CORS 헤더가 없을 때와 있을 때의 차이를 보여준다.
 *
 * [보안 경고] Access-Control-Allow-Origin: "*" 는 개발용이다.
 * 프로덕션에서는 반드시 허용할 도메인을 명시하라.
 */

const http = require("http");

// ============================================
// 헬퍼: HTTP 요청 보내기
// ============================================
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ============================================
// 서버: CORS 헤더 없는 API (잘못된 방식)
// ============================================
function createNoCorsServer() {
  return http.createServer((req, res) => {
    // CORS 헤더 없음 — 브라우저가 응답을 차단한다
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "CORS 헤더 없는 응답" }));
  });
}

// ============================================
// 서버: CORS 헤더 있는 API (올바른 방식)
// ============================================
function createCorsServer() {
  return http.createServer((req, res) => {
    const corsHeaders = {
      // 허용할 출처 — "*"는 개발용. 프로덕션에서는 "https://my-app.com" 같이 명시
      "Access-Control-Allow-Origin": "https://my-app.com",
      // 허용할 HTTP 메서드
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      // 허용할 요청 헤더
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      // preflight 결과 캐시 시간 (초) — 이 시간 동안 OPTIONS 재요청 안 함
      "Access-Control-Max-Age": "86400",
    };

    // ────────────────────────────────────
    // Preflight 요청 처리 (OPTIONS)
    // ────────────────────────────────────
    // 브라우저는 "단순 요청"이 아닌 경우 먼저 OPTIONS 요청을 보낸다.
    // 단순 요청 조건: GET/HEAD/POST + 특별한 헤더 없음 + Content-Type이 기본값
    // 그 외(PUT, DELETE, Authorization 헤더 등) → preflight 필요
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    // 일반 응답에도 CORS 헤더 포함
    res.writeHead(200, {
      "Content-Type": "application/json",
      ...corsHeaders,
    });
    res.end(JSON.stringify({ message: "CORS 헤더가 있는 응답" }));
  });
}

// ============================================
// 데모 실행
// ============================================
async function runDemo() {
  const PORT_NO_CORS = 9010;
  const PORT_CORS = 9011;

  const noCorsServer = createNoCorsServer();
  const corsServer = createCorsServer();

  // 서버 시작을 Promise로 감싸기
  await new Promise((resolve) => noCorsServer.listen(PORT_NO_CORS, resolve));
  await new Promise((resolve) => corsServer.listen(PORT_CORS, resolve));

  try {
    console.log("=== CORS (Cross-Origin Resource Sharing) 데모 ===\n");

    // ──────────────────────────────────
    // 1. CORS 헤더 없는 서버 테스트
    // ──────────────────────────────────
    console.log("=== 1. CORS 헤더 없는 서버 (잘못된 방식) ===\n");

    const noCorsRes = await request({
      hostname: "localhost",
      port: PORT_NO_CORS,
      path: "/api/data",
      method: "GET",
    });

    console.log("  응답 상태: " + noCorsRes.status);
    console.log("  응답 본문: " + noCorsRes.body);
    console.log("  Access-Control-Allow-Origin 헤더: " + (noCorsRes.headers["access-control-allow-origin"] || "(없음)"));
    console.log("");
    console.log("  [문제] 서버는 정상 응답하지만, 브라우저에서는:");
    console.log("    -> 다른 도메인(예: localhost:3000)에서 이 서버로 fetch() 하면");
    console.log("    -> 브라우저가 응답을 차단하고 콘솔에 에러를 표시한다:");
    console.log('    -> "Access to fetch at ... has been blocked by CORS policy"');
    console.log("");
    console.log("  참고: Node.js에서 http.request()로 직접 요청하면 CORS 제한이 없다.");
    console.log("        CORS는 '브라우저'가 사용자를 보호하기 위해 적용하는 정책이다.");
    console.log("");

    // ──────────────────────────────────
    // 2. CORS 헤더 있는 서버 테스트
    // ──────────────────────────────────
    console.log("=== 2. CORS 헤더 있는 서버 (올바른 방식) ===\n");

    const corsRes = await request({
      hostname: "localhost",
      port: PORT_CORS,
      path: "/api/data",
      method: "GET",
    });

    console.log("  응답 상태: " + corsRes.status);
    console.log("  응답 본문: " + corsRes.body);
    console.log("  Access-Control-Allow-Origin: " + corsRes.headers["access-control-allow-origin"]);
    console.log("  Access-Control-Allow-Methods: " + corsRes.headers["access-control-allow-methods"]);
    console.log("  Access-Control-Allow-Headers: " + corsRes.headers["access-control-allow-headers"]);
    console.log("");
    console.log("  [성공] 브라우저가 CORS 헤더를 확인하고 응답을 허용한다.");
    console.log("");

    // ──────────────────────────────────
    // 3. Preflight (OPTIONS) 요청 데모
    // ──────────────────────────────────
    console.log("=== 3. Preflight (OPTIONS) 요청 데모 ===\n");

    console.log("  브라우저가 preflight를 보내는 조건:");
    console.log("    - PUT, DELETE 등 '단순하지 않은' HTTP 메서드 사용");
    console.log("    - Authorization 등 커스텀 헤더 사용");
    console.log("    - Content-Type이 application/json인 경우");
    console.log("");

    // preflight 시뮬레이션
    console.log("  시뮬레이션: PUT /api/data + Authorization 헤더를 보내기 전");
    console.log("  브라우저가 먼저 OPTIONS 요청을 보낸다:");
    console.log("");

    const preflightRes = await request({
      hostname: "localhost",
      port: PORT_CORS,
      path: "/api/data",
      method: "OPTIONS",
      headers: {
        Origin: "https://my-app.com",
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
      },
    });

    console.log("  --- Preflight 요청 (브라우저가 자동 전송) ---");
    console.log("  요청: OPTIONS /api/data");
    console.log("  Origin: https://my-app.com");
    console.log("  Access-Control-Request-Method: PUT");
    console.log("  Access-Control-Request-Headers: Authorization, Content-Type");
    console.log("");
    console.log("  --- Preflight 응답 (서버) ---");
    console.log("  상태: " + preflightRes.status + " (204 No Content = 허용)");
    console.log("  Allow-Origin: " + preflightRes.headers["access-control-allow-origin"]);
    console.log("  Allow-Methods: " + preflightRes.headers["access-control-allow-methods"]);
    console.log("  Allow-Headers: " + preflightRes.headers["access-control-allow-headers"]);
    console.log("  Max-Age: " + preflightRes.headers["access-control-max-age"] + "초");
    console.log("");
    console.log("  -> 서버가 204로 응답하면 브라우저는 실제 PUT 요청을 보낸다.");
    console.log("  -> Max-Age 동안은 같은 조건의 preflight를 다시 보내지 않는다.");
    console.log("");

    // ──────────────────────────────────
    // 4. preflight 후 실제 요청
    // ──────────────────────────────────
    console.log("  --- 실제 PUT 요청 (preflight 통과 후) ---");
    const actualRes = await request(
      {
        hostname: "localhost",
        port: PORT_CORS,
        path: "/api/data",
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer some-token",
          Origin: "https://my-app.com",
        },
      },
      JSON.stringify({ name: "테스트" })
    );

    console.log("  상태: " + actualRes.status);
    console.log("  응답: " + actualRes.body);
    console.log("");

    // ──────────────────────────────────
    // 핵심 정리
    // ──────────────────────────────────
    console.log("=== 핵심 정리 ===\n");
    console.log("  1. CORS는 브라우저의 보안 정책이다 (서버 간 통신에는 적용 안 됨).");
    console.log("  2. 서버가 Access-Control-Allow-Origin 헤더를 보내야 브라우저가 응답을 허용한다.");
    console.log("  3. 단순하지 않은 요청(PUT, Authorization 등)은 preflight(OPTIONS)가 먼저 간다.");
    console.log("  4. OPTIONS 핸들러가 없으면 preflight가 실패하여 실제 요청도 차단된다.");
    console.log("");
    console.log("  [보안 경고]");
    console.log('  - Allow-Origin: "*" 는 개발 중에만 사용하라.');
    console.log("  - 프로덕션에서는 허용할 도메인을 명시적으로 지정하라.");
    console.log("  - credentials(쿠키)를 보내려면 Allow-Origin에 * 를 쓸 수 없다.");
  } finally {
    noCorsServer.close();
    corsServer.close();
  }
}

runDemo().catch((err) => {
  console.error("에러 발생:", err.message);
  process.exit(1);
});
