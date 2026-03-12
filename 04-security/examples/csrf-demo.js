/**
 * CSRF (Cross-Site Request Forgery) 공격과 방어 데모
 * 실행: node csrf-demo.js
 *
 * CSRF가 어떻게 동작하는지 실제 서버로 시뮬레이션하고,
 * 토큰 기반 방어와 SameSite 쿠키로 막는 방법을 익힌다.
 */

const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");

console.log("=== CSRF (Cross-Site Request Forgery) 데모 ===\n");

console.log("CSRF란?");
console.log("  사용자가 로그인된 상태에서, 공격자의 페이지를 방문하면");
console.log("  공격자가 사용자의 권한으로 요청을 보낼 수 있는 공격이다.\n");
console.log("  예: 은행에 로그인한 상태에서 악성 사이트를 방문하면,");
console.log("      악성 사이트가 몰래 송금 요청을 보낼 수 있다.\n");

// ============================================
// 세션/계좌 시뮬레이션을 위한 인메모리 저장소
// ============================================
const sessions = new Map();
const accounts = {
  hong: { balance: 1000000, name: "홍길동" },
  attacker: { balance: 0, name: "공격자" },
};

function createSession(username) {
  const sessionId = crypto.randomBytes(16).toString("hex");
  sessions.set(sessionId, { username, createdAt: Date.now() });
  return sessionId;
}

function getSession(sessionId) {
  return sessions.get(sessionId);
}

// ============================================
// CSRF 토큰 저장소 (방어용)
// ============================================
const csrfTokens = new Map();

function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString("hex");
  csrfTokens.set(sessionId, token);
  return token;
}

function validateCsrfToken(sessionId, token) {
  const stored = csrfTokens.get(sessionId);
  if (!stored || !token) return false;
  // 타이밍 공격 방지를 위해 timingSafeEqual 사용
  try {
    return crypto.timingSafeEqual(
      Buffer.from(stored, "hex"),
      Buffer.from(token, "hex")
    );
  } catch {
    return false;
  }
}

// 요청 본문을 파싱하는 헬퍼
function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params));
    });
  });
}

// 쿠키 파싱 헬퍼
function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((pair) => {
    const [key, val] = pair.trim().split("=");
    if (key) cookies[key] = val;
  });
  return cookies;
}

// ============================================
// 1단계: 취약한 서버 (CSRF 방어 없음)
// ============================================
function runVulnerableDemo() {
  return new Promise((resolve) => {
    console.log("=== 1. 취약한 서버 (CSRF 방어 없음) ===\n");

    // 홍길동이 로그인한 상태 시뮬레이션
    const sessionId = createSession("hong");

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");

      // 송금 엔드포인트 — CSRF 토큰 검증 없음!
      if (url.pathname === "/transfer" && req.method === "POST") {
        const cookies = parseCookies(req);
        const session = getSession(cookies.session);

        if (!session) {
          res.writeHead(401);
          return res.end("로그인 필요");
        }

        const body = await parseBody(req);
        const amount = parseInt(body.amount, 10);
        const to = body.to;

        // 쿠키만으로 인증 — CSRF에 취약!
        if (accounts[session.username] && accounts[to]) {
          accounts[session.username].balance -= amount;
          accounts[to].balance += amount;
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(`${amount}원이 ${to}에게 송금되었습니다`);
          return;
        }

        res.writeHead(400);
        res.end("송금 실패");
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    // OS가 빈 포트를 자동 할당
    server.listen(0, () => {
      const actualPort = server.address().port;

      console.log(`  취약한 서버 시작 (포트 ${actualPort})\n`);
      console.log("  [상황] 홍길동이 은행 사이트에 로그인한 상태");
      console.log(
        `  잔액: 홍길동 = ${accounts.hong.balance.toLocaleString()}원, 공격자 = ${accounts.attacker.balance.toLocaleString()}원\n`
      );

      // 공격 시뮬레이션: 공격자의 페이지가 송금 요청을 보냄
      console.log("  [공격] 공격자가 숨겨진 form으로 송금 요청을 보냄...");
      console.log("  공격자의 HTML:");
      console.log('    <form id="csrf" action="/transfer" method="POST">');
      console.log('      <input type="hidden" name="to" value="attacker">');
      console.log('      <input type="hidden" name="amount" value="500000">');
      console.log("    </form>");
      console.log(
        "    <script>document.getElementById('csrf').submit()</script>\n"
      );

      // HTTP 요청으로 공격 시뮬레이션
      const postData = "to=attacker&amount=500000";
      const options = {
        hostname: "localhost",
        port: actualPort,
        path: "/transfer",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          // 브라우저가 자동으로 쿠키를 포함 — 이것이 CSRF의 핵심!
          Cookie: `session=${sessionId}`,
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log(`  [결과] 서버 응답: ${data}`);
          console.log(
            `  잔액: 홍길동 = ${accounts.hong.balance.toLocaleString()}원, 공격자 = ${accounts.attacker.balance.toLocaleString()}원`
          );
          console.log(
            "  → 홍길동은 아무것도 모르는데 50만원이 빠져나갔다!\n"
          );
          console.log("  왜 이런 일이 발생하는가?");
          console.log(
            "  → 브라우저는 같은 도메인으로의 요청에 쿠키를 자동 포함한다."
          );
          console.log(
            "  → 서버는 쿠키만 확인하므로, 요청이 어디서 왔는지 구분하지 못한다.\n"
          );

          server.close(() => resolve());
        });
      });
      req.write(postData);
      req.end();
    });
  });
}

// ============================================
// 2단계: 안전한 서버 (CSRF 토큰 방어)
// ============================================
function runSecureDemo() {
  return new Promise((resolve) => {
    console.log("=== 2. 안전한 서버 (CSRF 토큰 방어) ===\n");

    // 계좌 초기화
    accounts.hong.balance = 1000000;
    accounts.attacker.balance = 0;

    const sessionId = createSession("hong");
    const csrfToken = generateCsrfToken(sessionId);

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");

      // 송금 폼 페이지 — CSRF 토큰을 숨겨진 필드로 포함
      if (url.pathname === "/form" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <form action="/transfer" method="POST">
            <input type="hidden" name="_csrf" value="${csrfToken}">
            <input name="to" placeholder="수신자">
            <input name="amount" placeholder="금액">
            <button>송금</button>
          </form>
        `);
        return;
      }

      // 송금 엔드포인트 — CSRF 토큰 검증 추가!
      if (url.pathname === "/transfer" && req.method === "POST") {
        const cookies = parseCookies(req);
        const session = getSession(cookies.session);

        if (!session) {
          res.writeHead(401);
          return res.end("로그인 필요");
        }

        const body = await parseBody(req);

        // CSRF 토큰 검증 — 핵심 방어!
        if (!validateCsrfToken(cookies.session, body._csrf)) {
          res.writeHead(403, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("CSRF 토큰이 유효하지 않습니다. 요청이 거부되었습니다.");
          return;
        }

        const amount = parseInt(body.amount, 10);
        const to = body.to;

        if (accounts[session.username] && accounts[to]) {
          accounts[session.username].balance -= amount;
          accounts[to].balance += amount;
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(`${amount}원이 ${to}에게 송금되었습니다`);
          return;
        }

        res.writeHead(400);
        res.end("송금 실패");
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    server.listen(0, () => {
      const actualPort = server.address().port;

      console.log(`  안전한 서버 시작 (포트 ${actualPort})\n`);
      console.log("  [방어] CSRF 토큰 기반 보호 적용됨");
      console.log(
        `  서버가 생성한 CSRF 토큰: ${csrfToken.substring(0, 16)}...\n`
      );

      console.log("  --- 공격 시도: CSRF 토큰 없이 송금 요청 ---");

      // 공격: 토큰 없이 요청
      const attackData = "to=attacker&amount=500000";
      const attackOptions = {
        hostname: "localhost",
        port: actualPort,
        path: "/transfer",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(attackData),
          Cookie: `session=${sessionId}`,
        },
      };

      const attackReq = http.request(attackOptions, (attackRes) => {
        let data = "";
        attackRes.on("data", (chunk) => (data += chunk));
        attackRes.on("end", () => {
          console.log(`  서버 응답 (${attackRes.statusCode}): ${data}`);
          console.log(
            `  잔액: 홍길동 = ${accounts.hong.balance.toLocaleString()}원, 공격자 = ${accounts.attacker.balance.toLocaleString()}원`
          );
          console.log(
            "  → 공격이 차단되었다! 토큰이 없으면 요청이 거부된다.\n"
          );

          // 정상 요청: 올바른 CSRF 토큰 포함
          console.log("  --- 정상 요청: 올바른 CSRF 토큰 포함 ---");
          const legitimateData = `to=attacker&amount=100000&_csrf=${csrfToken}`;
          const legitimateOptions = {
            hostname: "localhost",
            port: actualPort,
            path: "/transfer",
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Content-Length": Buffer.byteLength(legitimateData),
              Cookie: `session=${sessionId}`,
            },
          };

          const legitimateReq = http.request(legitimateOptions, (legRes) => {
            let legData = "";
            legRes.on("data", (chunk) => (legData += chunk));
            legRes.on("end", () => {
              console.log(`  서버 응답 (${legRes.statusCode}): ${legData}`);
              console.log(
                `  잔액: 홍길동 = ${accounts.hong.balance.toLocaleString()}원, 공격자 = ${accounts.attacker.balance.toLocaleString()}원`
              );
              console.log(
                "  → 정상적인 요청은 토큰이 포함되어 있으므로 허용된다.\n"
              );

              server.close(() => resolve());
            });
          });
          legitimateReq.write(legitimateData);
          legitimateReq.end();
        });
      });
      attackReq.write(attackData);
      attackReq.end();
    });
  });
}

// ============================================
// 3단계: SameSite 쿠키 설명
// ============================================
function showSameSiteCookieInfo() {
  console.log("=== 3. SameSite 쿠키 속성 ===\n");

  console.log("SameSite 속성은 브라우저 레벨에서 CSRF를 방어한다.\n");

  const sameSiteExamples = [
    {
      attr: "SameSite=Strict",
      header: "Set-Cookie: session=abc123; SameSite=Strict; HttpOnly; Secure",
      desc: "다른 사이트에서의 모든 요청에 쿠키를 보내지 않음",
      pros: "가장 안전 — CSRF 완전 차단",
      cons: "외부 링크로 접속 시에도 쿠키 안 보냄 (매번 재로그인)",
    },
    {
      attr: "SameSite=Lax (기본값, 권장)",
      header: "Set-Cookie: session=abc123; SameSite=Lax; HttpOnly; Secure",
      desc: "다른 사이트에서의 GET은 허용, POST/PUT/DELETE는 차단",
      pros: "CSRF 공격의 대부분(POST 기반)을 차단하면서 사용성 유지",
      cons: "GET 요청은 허용되므로 GET으로 상태 변경하면 안 됨",
    },
    {
      attr: "SameSite=None",
      header: "Set-Cookie: session=abc123; SameSite=None; HttpOnly; Secure",
      desc: "제한 없음 — 다른 사이트에서도 항상 쿠키를 보냄",
      pros: "서드파티 연동(OAuth 등)에 필요",
      cons: "CSRF에 완전히 취약 — 반드시 CSRF 토큰과 병용해야 함",
    },
  ];

  for (const example of sameSiteExamples) {
    console.log(`  [${example.attr}]`);
    console.log(`  헤더:   ${example.header}`);
    console.log(`  동작:   ${example.desc}`);
    console.log(`  장점:   ${example.pros}`);
    console.log(`  단점:   ${example.cons}`);
    console.log();
  }

  console.log("  실무 팁:");
  console.log("  - 대부분의 경우 SameSite=Lax면 충분하다");
  console.log("  - SameSite=Lax + CSRF 토큰을 함께 사용하면 가장 안전하다");
  console.log(
    "  - GET 요청으로 데이터를 변경하지 마라 (SameSite=Lax가 GET은 허용하므로)\n"
  );
}

// ============================================
// 4단계: CSRF 방어 전략 정리
// ============================================
function showDefenseSummary() {
  console.log("=== CSRF 방어 전략 정리 ===\n");

  console.log("1. CSRF 토큰 (Synchronizer Token Pattern)");
  console.log("   - 서버가 랜덤 토큰을 생성하여 폼에 숨겨진 필드로 포함");
  console.log("   - 요청 시 토큰을 함께 전송, 서버에서 검증");
  console.log("   - 공격자는 토큰 값을 알 수 없으므로 위조 불가\n");

  console.log("2. SameSite 쿠키");
  console.log("   - 브라우저가 자동으로 교차 사이트 요청에 쿠키를 제한");
  console.log("   - Lax(기본값)로 대부분의 CSRF를 차단\n");

  console.log("3. Origin/Referer 헤더 검증");
  console.log("   - 요청의 Origin 헤더가 자신의 도메인인지 확인");
  console.log("   - 보조 수단으로 사용 (단독으로 의존하지 마라)\n");

  console.log("4. 커스텀 요청 헤더 (Double Submit Cookie)");
  console.log("   - AJAX 요청에 커스텀 헤더(예: X-CSRF-Token)를 추가");
  console.log(
    "   - 교차 출처 요청은 커스텀 헤더를 보낼 수 없다 (CORS 제한)\n"
  );

  console.log("=== AI가 자주 놓치는 CSRF 실수 ===");
  console.log("1. GET 요청으로 데이터를 변경하는 API 설계");
  console.log("2. CSRF 토큰 없이 세션 쿠키만으로 인증");
  console.log("3. SameSite 쿠키 속성을 설정하지 않음");
  console.log(
    "4. CSRF 토큰을 비교할 때 === 대신 timingSafeEqual을 사용하지 않음"
  );
}

// ============================================
// 전체 데모 실행
// ============================================
async function main() {
  await runVulnerableDemo();
  await runSecureDemo();
  showSameSiteCookieInfo();
  showDefenseSummary();
}

main();
