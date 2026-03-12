/**
 * REST API 서버 통합 테스트
 * 실행: node rest-api-test.js
 *
 * 서버를 띄우고, HTTP 요청을 보내 응답을 검증한 뒤, 서버를 종료한다.
 */

const http = require("http");
const { fork } = require("child_process");
const path = require("path");

const TEST_PORT = 3001;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  OK  ${message}`);
  } else {
    failed++;
    console.log(`  FAIL ${message}`);
  }
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: TEST_PORT,
      path: urlPath,
      method,
      headers: { "Content-Type": "application/json" },
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`요청 타임아웃: ${method} ${urlPath} (5초 초과)`));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("=== REST API 통합 테스트 ===\n");

  // GET /api/users — 목록 조회
  const list = await request("GET", "/api/users");
  assert(list.status === 200, "GET /api/users → 200");
  assert(Array.isArray(list.body), "응답이 배열");

  // GET /api/users/1 — 단건 조회
  const one = await request("GET", "/api/users/1");
  assert(one.status === 200, "GET /api/users/1 → 200");
  assert(one.body.name === "홍길동", "유저 이름 확인");

  // GET /api/users/999 — 없는 유저
  const notFound = await request("GET", "/api/users/999");
  assert(notFound.status === 404, "GET /api/users/999 → 404");

  // POST /api/users — 생성
  const created = await request("POST", "/api/users", {
    name: "테스트",
    email: "test@test.com",
  });
  assert(created.status === 201, "POST /api/users → 201");
  assert(created.body.name === "테스트", "생성된 유저 이름 확인");

  // POST /api/users — 필수 필드 누락
  const badPost = await request("POST", "/api/users", { name: "이름만" });
  assert(badPost.status === 400, "POST 필수 필드 누락 → 400");

  // PATCH /api/users/:id — 수정
  const patched = await request("PATCH", `/api/users/${created.body.id}`, {
    name: "수정됨",
  });
  assert(patched.status === 200, "PATCH → 200");
  assert(patched.body.name === "수정됨", "수정된 이름 확인");

  // DELETE /api/users/:id — 삭제
  const deleted = await request("DELETE", `/api/users/${created.body.id}`);
  assert(deleted.status === 204, "DELETE → 204");

  // 404 라우트
  const badRoute = await request("GET", "/not-exist");
  assert(badRoute.status === 404, "잘못된 경로 → 404");

  console.log(`\n결과: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

// 서버를 별도 프로세스로 실행
const serverPath = path.join(__dirname, "rest-api-server.js");
const serverProcess = fork(serverPath, [], {
  env: { ...process.env, PORT: String(TEST_PORT) },
  silent: true,
});

// 프로세스 종료 시 서버도 반드시 정리
process.on("exit", () => serverProcess.kill());

// 서버 stdout에서 "서버 실행" 메시지가 나오면 테스트 시작
serverProcess.stdout.on("data", (data) => {
  if (data.toString().includes("서버 실행")) {
    runTests()
      .catch((err) => {
        console.error("테스트 실패:", err.message);
        process.exit(1);
      })
      .finally(() => {
        serverProcess.kill();
      });
  }
});

serverProcess.on("error", (err) => {
  console.error("서버 시작 실패:", err.message);
  process.exit(1);
});
