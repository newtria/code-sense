/**
 * JWT 인증 흐름 예제 (외부 라이브러리 없이 구현)
 * 실행: node jwt-auth-example.js
 *
 * 실무에서는 jsonwebtoken 라이브러리를 사용하지만,
 * JWT가 내부적으로 어떻게 동작하는지 이해하기 위한 예제.
 */

const crypto = require("crypto");

// ============================================
// JWT 직접 구현 (학습용)
// ============================================

const SECRET_KEY = "my-secret-key"; // 실무에서는 환경변수로!

function base64url(str) {
  return Buffer.from(str).toString("base64url");
}

function createJWT(payload) {
  // 1. 헤더
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

  // 2. 페이로드 (만료시간 추가)
  const fullPayload = base64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000), // 발급 시각
      exp: Math.floor(Date.now() / 1000) + 3600, // 1시간 후 만료
    })
  );

  // 3. 서명
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${fullPayload}`)
    .digest("base64url");

  return `${header}.${fullPayload}.${signature}`;
}

function verifyJWT(token) {
  const [header, payload, signature] = token.split(".");

  // 서명 검증
  const expectedSignature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expectedSignature, "base64url");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid signature — 토큰이 변조되었습니다");
  }

  // 페이로드 디코딩
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());

  // 만료 확인
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired — 토큰이 만료되었습니다");
  }

  return decoded;
}

// ============================================
// 실행
// ============================================

console.log("=== JWT 인증 흐름 데모 ===\n");

// 1. 로그인 성공 → 토큰 발급
console.log("1. 로그인 성공 → JWT 발급");
const token = createJWT({ userId: 1, role: "admin", email: "hong@test.com" });
console.log(`   토큰: ${token}\n`);

// 2. 토큰 구조 확인 (누구나 디코딩 가능!)
console.log("2. 토큰 디코딩 (Base64 — 암호화가 아님!)");
const [h, p] = token.split(".");
console.log(
  `   헤더:    ${JSON.stringify(JSON.parse(Buffer.from(h, "base64url").toString()))}`
);
console.log(
  `   페이로드: ${JSON.stringify(JSON.parse(Buffer.from(p, "base64url").toString()))}`
);
console.log(
  "   → 비밀번호, 주민번호 등 민감정보를 절대 넣지 마라!\n"
);

// 3. 정상 검증
console.log("3. 토큰 검증 (정상)");
try {
  const decoded = verifyJWT(token);
  console.log(`   검증 성공: userId=${decoded.userId}, role=${decoded.role}\n`);
} catch (err) {
  console.log(`   검증 실패: ${err.message}\n`);
}

// 4. 변조된 토큰 검증
console.log("4. 변조된 토큰 검증");
const tamperedPayload = base64url(
  JSON.stringify({ userId: 1, role: "admin", isGod: true })
);
const [origHeader, , origSig] = token.split(".");
const tamperedToken = `${origHeader}.${tamperedPayload}.${origSig}`;
try {
  verifyJWT(tamperedToken);
  console.log("   검증 성공 (이러면 안 됨!)\n");
} catch (err) {
  console.log(`   검증 실패: ${err.message}`);
  console.log("   → 서명이 달라져서 변조 감지됨!\n");
}

console.log("=== 핵심 정리 ===");
console.log("- JWT는 암호화가 아니라 서명이다. 누구나 내용을 볼 수 있다.");
console.log("- 서명 덕분에 내용이 변조되면 감지할 수 있다.");
console.log("- 비밀키가 유출되면 누구나 유효한 토큰을 만들 수 있다.");
console.log("- 만료 시간을 반드시 설정하라.");
