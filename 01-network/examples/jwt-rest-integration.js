/**
 * JWT 인증 + REST API 통합 데모
 * 실행: node jwt-rest-integration.js
 *
 * Node.js 내장 모듈만 사용 (http, crypto).
 * 서버를 띄우고, 로그인 -> 토큰 발급 -> 보호된 라우트 접근을 시연한 뒤 종료한다.
 *
 * [보안 경고]
 * - SECRET_KEY를 코드에 하드코딩하지 마라. 환경변수(process.env)를 사용하라.
 * - 실무에서는 jsonwebtoken 라이브러리 + bcrypt 패스워드 해싱을 사용하라.
 * - 이 코드는 학습 목적의 데모이며 프로덕션에 그대로 쓰면 안 된다.
 */

const http = require("http");
const crypto = require("crypto");

// ============================================
// JWT 구현 (학습용 — jwt-auth-example.js에서 가져옴)
// ============================================

const SECRET_KEY = "demo-secret-key-환경변수로-관리하라";

function base64url(data) {
  return Buffer.from(data).toString("base64url");
}

function createJWT(payload, expiresInSec = 3600) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = base64url(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })
  );
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${fullPayload}`)
    .digest("base64url");
  return `${header}.${fullPayload}.${signature}`;
}

function verifyJWT(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("잘못된 토큰 형식");

  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("토큰 서명이 유효하지 않습니다");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("토큰이 만료되었습니다");
  }
  return decoded;
}

// ============================================
// 인메모리 유저 DB (데모용)
// ============================================

const USERS = [
  { id: 1, email: "admin@test.com", password: "admin123", role: "admin" },
  { id: 2, email: "user@test.com", password: "user123", role: "user" },
];

// ============================================
// 요청 바디 파서
// ============================================

const MAX_BODY = 1024 * 1024; // 1MB

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        req.destroy();
        return reject(new Error("요청 본문이 너무 큽니다"));
      }
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("잘못된 JSON"));
      }
    });
  });
}

// ============================================
// JSON 응답 헬퍼
// ============================================

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ============================================
// 인증 미들웨어
// ============================================

function authenticate(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Authorization 헤더가 없거나 형식이 잘못됨", status: 401 };
  }

  const token = authHeader.slice(7); // "Bearer " 제거
  try {
    const decoded = verifyJWT(token);
    return { user: decoded };
  } catch (err) {
    return { error: err.message, status: 401 };
  }
}

// ============================================
// 서버 생성
// ============================================

function createServer() {
  return http.createServer(async (req, res) => {
    const { method, url } = req;

    try {
      // ── POST /login ── 로그인 (토큰 발급)
      if (method === "POST" && url === "/login") {
        const { email, password } = await parseBody(req);
        const user = USERS.find(
          (u) => u.email === email && u.password === password
        );
        if (!user) {
          return json(res, 401, { error: "이메일 또는 비밀번호가 틀렸습니다" });
        }
        const token = createJWT({ userId: user.id, email: user.email, role: user.role });
        return json(res, 200, { token, message: `${user.email} 로그인 성공` });
      }

      // ── GET /profile ── 보호된 라우트 (토큰 필수)
      if (method === "GET" && url === "/profile") {
        const auth = authenticate(req);
        if (auth.error) {
          return json(res, auth.status, { error: auth.error });
        }
        const user = USERS.find((u) => u.id === auth.user.userId);
        return json(res, 200, {
          message: "인증된 사용자의 프로필",
          profile: { id: user.id, email: user.email, role: user.role },
        });
      }

      // ── GET /admin ── 관리자 전용 라우트 (role 체크)
      if (method === "GET" && url === "/admin") {
        const auth = authenticate(req);
        if (auth.error) {
          return json(res, auth.status, { error: auth.error });
        }
        if (auth.user.role !== "admin") {
          return json(res, 403, { error: "관리자 권한이 필요합니다 (403 Forbidden)" });
        }
        return json(res, 200, {
          message: "관리자 전용 데이터",
          secrets: ["서버 설정", "사용자 통계"],
        });
      }

      return json(res, 404, { error: "Not Found" });
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  });
}

// ============================================
// 테스트용 HTTP 요청 헬퍼
// ============================================

function httpRequest(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port,
      path,
      method,
      headers: { "Content-Type": "application/json", ...headers },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============================================
// 데모 실행
// ============================================

async function runDemo() {
  const PORT = 9020;
  const server = createServer();
  await new Promise((resolve) => server.listen(PORT, resolve));

  try {
    console.log("=== JWT 인증 + REST API 통합 데모 ===\n");

    // ── 1. 잘못된 로그인 시도 (실패 먼저 보여주기) ──
    console.log("=== 1. 잘못된 로그인 (실패) ===\n");
    const badLogin = await httpRequest(PORT, "POST", "/login", {
      email: "admin@test.com",
      password: "wrong-password",
    });
    console.log(`  POST /login (틀린 비밀번호)`);
    console.log(`  상태: ${badLogin.status}`);
    console.log(`  응답: ${JSON.stringify(badLogin.body)}`);
    console.log("  -> 401 Unauthorized — 비밀번호가 틀려서 토큰을 받지 못함\n");

    // ── 2. 토큰 없이 보호된 라우트 접근 (실패) ──
    console.log("=== 2. 토큰 없이 보호된 라우트 접근 (실패) ===\n");
    const noToken = await httpRequest(PORT, "GET", "/profile");
    console.log(`  GET /profile (토큰 없음)`);
    console.log(`  상태: ${noToken.status}`);
    console.log(`  응답: ${JSON.stringify(noToken.body)}`);
    console.log("  -> 401 Unauthorized — Authorization 헤더가 없음\n");

    // ── 3. 변조된 토큰으로 접근 (실패) ──
    console.log("=== 3. 변조된 토큰으로 접근 (실패) ===\n");
    const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjk5OX0.fakesignature";
    const tamperedRes = await httpRequest(PORT, "GET", "/profile", null, {
      Authorization: `Bearer ${fakeToken}`,
    });
    console.log(`  GET /profile (변조된 토큰)`);
    console.log(`  상태: ${tamperedRes.status}`);
    console.log(`  응답: ${JSON.stringify(tamperedRes.body)}`);
    console.log("  -> 401 — 서명이 유효하지 않아 거부됨\n");

    // ── 4. 정상 로그인 → 토큰 발급 (성공) ──
    console.log("=== 4. 정상 로그인 → 토큰 발급 (성공) ===\n");
    const adminLogin = await httpRequest(PORT, "POST", "/login", {
      email: "admin@test.com",
      password: "admin123",
    });
    console.log(`  POST /login (admin@test.com)`);
    console.log(`  상태: ${adminLogin.status}`);
    console.log(`  응답: ${JSON.stringify(adminLogin.body)}`);
    const adminToken = adminLogin.body.token;
    console.log(`  -> 200 OK — JWT 토큰 발급됨\n`);

    // ── 5. 토큰으로 보호된 라우트 접근 (성공) ──
    console.log("=== 5. 토큰으로 보호된 라우트 접근 (성공) ===\n");
    const profileRes = await httpRequest(PORT, "GET", "/profile", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    console.log(`  GET /profile (유효한 토큰)`);
    console.log(`  상태: ${profileRes.status}`);
    console.log(`  응답: ${JSON.stringify(profileRes.body)}`);
    console.log("  -> 200 OK — 인증 성공, 프로필 데이터 반환\n");

    // ── 6. 관리자 전용 라우트 (admin 성공) ──
    console.log("=== 6. 관리자 전용 라우트 — admin 계정 (성공) ===\n");
    const adminRes = await httpRequest(PORT, "GET", "/admin", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    console.log(`  GET /admin (admin 토큰)`);
    console.log(`  상태: ${adminRes.status}`);
    console.log(`  응답: ${JSON.stringify(adminRes.body)}`);
    console.log("  -> 200 OK — admin role이므로 접근 허용\n");

    // ── 7. 관리자 전용 라우트 — 일반 유저 (403 Forbidden) ──
    console.log("=== 7. 관리자 전용 라우트 — 일반 유저 (실패) ===\n");
    const userLogin = await httpRequest(PORT, "POST", "/login", {
      email: "user@test.com",
      password: "user123",
    });
    const userToken = userLogin.body.token;

    const forbiddenRes = await httpRequest(PORT, "GET", "/admin", null, {
      Authorization: `Bearer ${userToken}`,
    });
    console.log(`  GET /admin (일반 user 토큰)`);
    console.log(`  상태: ${forbiddenRes.status}`);
    console.log(`  응답: ${JSON.stringify(forbiddenRes.body)}`);
    console.log("  -> 403 Forbidden — 인증은 됐지만 권한이 부족함");
    console.log("  -> 401(인증 실패) vs 403(인가 실패) 차이를 기억하라!\n");

    // ── 핵심 정리 ──
    console.log("=== 핵심 정리 ===\n");
    console.log("  인증(Authentication) 흐름:");
    console.log("    1. POST /login → 이메일/비밀번호 검증 → JWT 발급");
    console.log("    2. 클라이언트가 토큰을 저장 (localStorage 또는 httpOnly 쿠키)");
    console.log("    3. 이후 요청마다 Authorization: Bearer <token> 헤더에 포함");
    console.log("    4. 서버가 토큰 서명을 검증하고 페이로드에서 유저 정보 추출");
    console.log("");
    console.log("  인가(Authorization) — 역할(role) 기반 접근 제어:");
    console.log("    - 401 Unauthorized: 인증 자체가 안 됨 (토큰 없음/만료/변조)");
    console.log("    - 403 Forbidden: 인증은 됐지만 권한 부족 (role 불일치)");
    console.log("");
    console.log("  [보안 경고]");
    console.log("  - SECRET_KEY를 코드에 하드코딩하지 마라 (환경변수 사용)");
    console.log("  - 비밀번호를 평문으로 저장하지 마라 (bcrypt/argon2 해싱 필수)");
    console.log("  - JWT 페이로드에 민감 정보를 넣지 마라 (Base64 디코딩 가능)");
    console.log("  - 토큰 만료 시간을 반드시 설정하라");
  } finally {
    server.close();
  }
}

runDemo().catch((err) => {
  console.error("에러 발생:", err.message);
  process.exit(1);
});
