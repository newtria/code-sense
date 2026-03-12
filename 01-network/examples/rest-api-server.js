/**
 * 간단한 REST API 서버 예제
 * 실행: node rest-api-server.js
 * 테스트: curl http://localhost:3000/api/users
 *
 * 외부 의존성 없이 Node.js 내장 http 모듈로 구현.
 * 프레임워크(Express 등)가 내부적으로 하는 일을 이해하기 위한 예제.
 */

const http = require("http");

// 인메모리 데이터 저장소
let users = [
  { id: 1, name: "홍길동", email: "hong@test.com" },
  { id: 2, name: "김영희", email: "kim@test.com" },
];
let nextId = 3;

// 요청 바디를 파싱하는 헬퍼
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        return reject(new Error("Request body too large"));
      }
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

// JSON 응답 헬퍼
function json(res, statusCode, data) {
  const headers = {
    // CORS 헤더 — 개발 중에만 * 사용. 프로덕션에서는 특정 도메인으로 제한하라.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (statusCode === 204) {
    res.writeHead(204, headers);
    return res.end();
  }

  headers["Content-Type"] = "application/json";
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // CORS Preflight 처리
  if (method === "OPTIONS") {
    return json(res, 204, null);
  }

  // 라우팅
  const match = url.match(/^\/api\/users(?:\/(\d+))?$/);
  if (!match) {
    return json(res, 404, { error: "Not Found" });
  }

  const id = match[1] ? parseInt(match[1]) : null;

  try {
    // GET /api/users — 목록 조회
    if (method === "GET" && !id) {
      return json(res, 200, users);
    }

    // GET /api/users/:id — 단건 조회
    if (method === "GET" && id) {
      const user = users.find((u) => u.id === id);
      if (!user) return json(res, 404, { error: "User not found" });
      return json(res, 200, user);
    }

    // POST /api/users — 생성
    if (method === "POST") {
      const body = await parseBody(req);
      if (!body.name || !body.email) {
        return json(res, 400, { error: "name and email are required" });
      }
      const newUser = { id: nextId++, name: body.name, email: body.email };
      users.push(newUser);
      return json(res, 201, newUser); // 201 Created
    }

    // PATCH /api/users/:id — 부분 수정
    if (method === "PATCH" && id) {
      const user = users.find((u) => u.id === id);
      if (!user) return json(res, 404, { error: "User not found" });
      const body = await parseBody(req);
      if (body.name) user.name = body.name;
      if (body.email) user.email = body.email;
      return json(res, 200, user);
    }

    // DELETE /api/users/:id — 삭제
    if (method === "DELETE" && id) {
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) return json(res, 404, { error: "User not found" });
      users.splice(index, 1);
      return json(res, 204, null); // 204 No Content
    }

    return json(res, 405, { error: "Method Not Allowed" });
  } catch (err) {
    return json(res, 400, { error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`REST API 서버 실행: http://localhost:${PORT}`);
  console.log("");
  console.log("테스트:");
  console.log(`  curl http://localhost:${PORT}/api/users`);
  console.log(`  curl http://localhost:${PORT}/api/users/1`);
  console.log(
    `  curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"name":"이철수","email":"lee@test.com"}'`
  );
  console.log(
    `  curl -X PATCH http://localhost:${PORT}/api/users/1 -H "Content-Type: application/json" -d '{"name":"홍길동2"}'`
  );
  console.log(`  curl -X DELETE http://localhost:${PORT}/api/users/1`);
});
