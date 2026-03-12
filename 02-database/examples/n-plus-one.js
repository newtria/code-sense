/**
 * N+1 문제 시연
 * 실행: node n-plus-one.js
 *
 * ORM에서 가장 흔한 성능 문제를 직접 확인한다.
 */

// 가상의 DB 호출을 시뮬레이션
let queryCount = 0;

async function simulateQuery(name, ms = 5) {
  queryCount++;
  await new Promise((r) => setTimeout(r, ms));
  return name;
}

// 가상 데이터
const users = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

const posts = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  userId: (i % 50) + 1,
  title: `Post ${i + 1}`,
}));

// ============================================
// N+1 문제 (나쁜 방식)
// ============================================
(async () => {
console.log("=== N+1 방식 (나쁨) ===\n");
queryCount = 0;
console.time("N+1");

// 1번 쿼리: 유저 전체 조회
await simulateQuery("SELECT * FROM users");

for (const user of users) {
  // N번 쿼리: 각 유저의 게시글을 개별 조회
  await simulateQuery(`SELECT * FROM posts WHERE user_id = ${user.id}`);
}

console.timeEnd("N+1");
console.log(`쿼리 횟수: ${queryCount}회 (1 + ${users.length} = ${queryCount})`);
console.log();

// ============================================
// 올바른 방식 (JOIN 또는 include)
// ============================================
console.log("=== JOIN 방식 (좋음) ===\n");
queryCount = 0;
console.time("JOIN");

// 1번 쿼리: 유저 전체 조회
await simulateQuery("SELECT * FROM users");
// 2번 쿼리: 해당 유저들의 게시글을 한 번에 조회
await simulateQuery(
  "SELECT * FROM posts WHERE user_id IN (1, 2, 3, ... 50)"
);

// 메모리에서 매핑 (실제 ORM은 여기서 객체를 조립한다)
users.forEach((user) => {
  user.posts = posts.filter((p) => p.userId === user.id);
});

console.timeEnd("JOIN");
console.log(`쿼리 횟수: ${queryCount}회`);
console.log();

// ============================================
// 비교
// ============================================
console.log("=== 비교 ===\n");
console.log("유저 50명, 게시글 200개인 경우:");
console.log(`  N+1:  51 쿼리 (유저가 1000명이면 1001 쿼리)`);
console.log(`  JOIN: 2 쿼리 (유저가 1000명이어도 2 쿼리)`);
console.log();
console.log("ORM 사용 시 체크포인트:");
console.log("  Prisma:   include 또는 select 사용");
console.log("  TypeORM:  relations 또는 createQueryBuilder 사용");
console.log("  Sequelize: include 사용");
console.log(
  "  공통:     반복문 안에서 DB 호출이 있으면 N+1을 의심하라"
);
})().catch((err) => {
  console.error("에러 발생:", err.message);
  process.exit(1);
});
