/**
 * 비밀번호 해싱 비교 데모
 * 실행: node password-hashing.js
 *
 * 왜 MD5/SHA256이 아닌 bcrypt를 써야 하는지 이해한다.
 */

const crypto = require("crypto");

console.log("=== 비밀번호 해싱 비교 ===\n");

const password = "mypassword123";

// ============================================
// 1. 평문 저장 (최악)
// ============================================
console.log("1. 평문 저장 (절대 하지 마라)");
console.log(`   저장값: ${password}`);
console.log("   → DB 유출 시 모든 비밀번호 즉시 노출\n");

// ============================================
// 2. MD5 (취약)
// ============================================
console.log("2. MD5 해싱 (쓰지 마라)");
const md5Hash = crypto.createHash("md5").update(password).digest("hex");
console.log(`   저장값: ${md5Hash}`);
console.log("   문제:");
console.log("   - 같은 입력 → 항상 같은 출력 (레인보우 테이블 공격)");
console.log("   - 너무 빠름 → 초당 수십억 회 시도 가능");
console.log("   - 솔트 없음\n");

// ============================================
// 3. SHA256 (조금 낫지만 여전히 부족)
// ============================================
console.log("3. SHA256 해싱 (역시 부족)");
const sha256Hash = crypto
  .createHash("sha256")
  .update(password)
  .digest("hex");
console.log(`   저장값: ${sha256Hash}`);
console.log("   문제: MD5보다 낫지만 동일한 근본 문제\n");

// ============================================
// 4. SHA256 + 솔트 (괜찮지만 최선은 아님)
// ============================================
console.log("4. SHA256 + 솔트 (보통)");
const salt = crypto.randomBytes(16).toString("hex");
const saltedHash = crypto
  .createHash("sha256")
  .update(salt + password)
  .digest("hex");
console.log(`   솔트:   ${salt}`);
console.log(`   저장값: ${salt}:${saltedHash}`);
console.log("   개선: 같은 비밀번호도 다른 해시 (레인보우 테이블 무력화)");
console.log("   문제: 여전히 빠름 → GPU로 초당 수억 회 시도 가능\n");

// ============================================
// 5. scrypt (Node.js 내장, bcrypt 대안)
// ============================================
console.log("5. scrypt (권장 — Node.js 내장)");

console.time("   scrypt 해싱");
const scryptSalt = crypto.randomBytes(16);
// 주의: scryptSync는 이벤트 루프를 블로킹한다.
// 프로덕션에서는 비동기 버전인 crypto.scrypt(password, salt, keylen, callback)을 사용하라.
const scryptHash = crypto.scryptSync(password, scryptSalt, 64); // 64바이트 = 512비트 키 출력
console.timeEnd("   scrypt 해싱");

const stored = `${scryptSalt.toString("hex")}:${scryptHash.toString("hex")}`;
console.log(`   저장값: ${stored.substring(0, 60)}...`);
console.log("   장점:");
console.log("   - 의도적으로 느림 (브루트포스 방지)");
console.log("   - 메모리를 많이 사용 (GPU 병렬화 어려움)");
console.log("   - 솔트 내장\n");

// 검증
function verifyScrypt(inputPassword, storedHash) {
  const [saltHex, hashHex] = storedHash.split(":");
  const saltBuf = Buffer.from(saltHex, "hex");
  const hashBuf = Buffer.from(hashHex, "hex");
  const inputHash = crypto.scryptSync(inputPassword, saltBuf, 64);
  return crypto.timingSafeEqual(inputHash, hashBuf);
}

console.log("   검증 테스트:");
console.log(
  `   올바른 비밀번호: ${verifyScrypt("mypassword123", stored)}`
);
console.log(
  `   틀린 비밀번호:   ${verifyScrypt("wrongpassword", stored)}`
);
console.log();

// ============================================
// 속도 비교
// ============================================
console.log("=== 속도 비교 (1000회 반복) ===\n");

console.time("MD5    x 1000");
for (let i = 0; i < 1000; i++) {
  crypto.createHash("md5").update(password).digest("hex");
}
console.timeEnd("MD5    x 1000");

console.time("SHA256 x 1000");
for (let i = 0; i < 1000; i++) {
  crypto.createHash("sha256").update(password).digest("hex");
}
console.timeEnd("SHA256 x 1000");

console.time("scrypt x 10  "); // scrypt는 의도적으로 느려서 10회만 비교
for (let i = 0; i < 10; i++) {
  crypto.scryptSync(password, crypto.randomBytes(16), 64);
}
console.timeEnd("scrypt x 10  ");

console.log("\n→ scrypt는 의도적으로 느리다. 이것이 보안이다.");
console.log("→ 공격자가 비밀번호 하나를 추측하는 데 수십ms가 걸리면,");
console.log("   1억 개를 시도하려면 수년이 걸린다.");

console.log("\n=== 실무 가이드 ===");
console.log("Node.js:  crypto.scrypt (내장) 또는 bcrypt (npm)");
console.log("Python:   bcrypt 또는 argon2");
console.log("Java:     BCryptPasswordEncoder (Spring Security)");
console.log("Go:       golang.org/x/crypto/bcrypt");
