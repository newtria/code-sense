/**
 * 에러 핸들링 패턴 데모
 * 실행: node error-handling-demo.js
 *
 * AI가 만든 코드에서 에러 핸들링이 제대로 되어 있는지 판단하는 눈을 기른다.
 */

// ============================================
// 1. 커스텀 에러 클래스
// ============================================
console.log("=== 1. 커스텀 에러 클래스 ===\n");

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    // 스택 트레이스가 AppError 생성자가 아닌 실제 호출 지점을 가리키게 한다
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource}을(를) 찾을 수 없습니다`, 404, "NOT_FOUND");
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super("인증이 필요합니다", 401, "UNAUTHORIZED");
  }
}

// 사용 예시
function findUser(id) {
  const users = { 1: { id: 1, name: "홍길동" } };
  const user = users[id];
  if (!user) throw new NotFoundError("유저");
  return user;
}

function validateEmail(email) {
  if (!email || !email.includes("@")) {
    throw new ValidationError("이메일 형식이 올바르지 않습니다");
  }
}

// 에러 타입별 분기 처리
function handleRequest(userId, email) {
  try {
    validateEmail(email);
    return findUser(userId);
  } catch (err) {
    if (err instanceof ValidationError) {
      console.log(`  [400] ${err.message}`);
    } else if (err instanceof NotFoundError) {
      console.log(`  [404] ${err.message}`);
    } else {
      console.log(`  [500] 서버 오류가 발생했습니다`);
      console.log(`  (내부 로그: ${err.message})`);
    }
    return null;
  }
}

console.log("정상 요청:");
const user = handleRequest(1, "hong@test.com");
console.log(`  결과: ${JSON.stringify(user)}\n`);

console.log("잘못된 이메일:");
handleRequest(1, "invalid");
console.log();

console.log("존재하지 않는 유저:");
handleRequest(999, "test@test.com");
console.log();

// ============================================
// 2. 나쁜 에러 핸들링 vs 좋은 에러 핸들링
// ============================================
console.log("=== 2. 나쁜 vs 좋은 에러 핸들링 ===\n");

// 나쁜 예 1: 빈 catch
console.log("나쁜 예 1 — 빈 catch 블록:");
console.log("  try { riskyOperation(); } catch (err) { }");
console.log("  → 에러가 삼켜져서 디버깅이 불가능해진다\n");

// 나쁜 예 2: 스택 트레이스 노출
console.log("나쁜 예 2 — 에러 응답에 스택 트레이스 노출:");
try {
  JSON.parse("invalid json");
} catch (err) {
  console.log("  위험한 응답: { error: '...', stack: 'SyntaxError: ... at line 98 ...' }");
  console.log("  → 공격자에게 서버 내부 구조를 알려주는 꼴\n");

  const goodResponse = {
    error: {
      code: "INVALID_INPUT",
      message: "요청 데이터를 처리할 수 없습니다",
    },
  };
  console.log("  안전한 응답:", JSON.stringify(goodResponse));
  console.log("  → 사용자에게 필요한 정보만 반환\n");
}

// 나쁜 예 3: 모든 에러에 500
console.log("나쁜 예 3 — 모든 에러에 500 반환:");
console.log("  catch (err) { res.status(500).json({ error: err.message }) }");
console.log("  → 클라이언트가 잘못된 입력인지, 권한 문제인지 구분 못 함");
console.log("  → 400, 401, 403, 404, 409 등 적절한 코드를 사용하라\n");

// ============================================
// 3. 비동기 에러 처리
// ============================================
(async () => {
  console.log("=== 3. 비동기 에러 처리 ===\n");

  async function riskyAsync() {
    throw new Error("비동기 에러 발생!");
  }

  // 나쁜 방식: unhandled rejection
  console.log("나쁜 방식 — try/catch 없는 async:");
  console.log("  async function handler(req, res) {");
  console.log("    const data = await riskyOperation(); // 에러 발생 시?");
  console.log("    res.json(data); // → 실행 안 됨, 응답 없음, 클라이언트 무한 대기");
  console.log("  }\n");

  // 좋은 방식: try/catch
  console.log("좋은 방식 — try/catch로 감싸기:");

  async function safeHandler() {
    try {
      await riskyAsync();
      return { success: true };
    } catch (err) {
      console.log(`  에러 포착: ${err.message}`);
      return { error: { code: "INTERNAL_ERROR", message: "처리 중 오류 발생" } };
    }
  }

  const result = await safeHandler();
  console.log(`  응답: ${JSON.stringify(result)}\n`);

  // asyncHandler 래퍼 패턴
  console.log("더 깔끔한 방식 — asyncHandler 래퍼:");
  console.log("  const asyncHandler = (fn) => (req, res, next) =>");
  console.log("    Promise.resolve(fn(req, res, next)).catch(next);");
  console.log("");
  console.log("  app.get('/users/:id', asyncHandler(async (req, res) => {");
  console.log("    const user = await getUser(req.params.id);");
  console.log("    res.json(user);");
  console.log("  }));");
  console.log("  → 에러가 자동으로 글로벌 에러 핸들러로 전달됨\n");

  // ============================================
  // 4. 에러 응답 형식 통일
  // ============================================
  console.log("=== 4. 일관된 에러 응답 형식 ===\n");

  function formatErrorResponse(err) {
    if (err instanceof AppError) {
      return {
        status: err.statusCode,
        body: { error: { code: err.code, message: err.message } },
      };
    }
    return {
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다" } },
    };
  }

  const errors = [
    new ValidationError("이름은 필수입니다"),
    new NotFoundError("게시글"),
    new UnauthorizedError(),
    new Error("예상치 못한 에러"),
  ];

  for (const err of errors) {
    const response = formatErrorResponse(err);
    console.log(`  ${err.constructor.name} → HTTP ${response.status}: ${JSON.stringify(response.body)}`);
  }

  console.log("\n=== 핵심 정리 ===");
  console.log("1. 커스텀 에러 클래스로 에러 타입을 구분하라");
  console.log("2. 빈 catch 블록은 금지 — 최소한 로깅이라도 하라");
  console.log("3. 에러 응답에 스택 트레이스를 절대 노출하지 마라");
  console.log("4. HTTP 상태 코드를 에러 성격에 맞게 사용하라");
  console.log("5. async 함수에서 try/catch를 빠뜨리지 마라");
  console.log("6. 에러 응답 형식을 프로젝트 전체에서 통일하라");
})();
