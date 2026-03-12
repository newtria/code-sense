/**
 * Cache-Aside 패턴 구현 예제
 * 실행: node cache-aside.js
 *
 * 실무에서는 Redis를 사용하지만, 원리를 이해하기 위해 메모리로 구현.
 */

// ============================================
// 간단한 인메모리 캐시 구현
// ============================================
class SimpleCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    // TTL 확인
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null; // 만료됨
    }

    return item.value;
  }

  set(key, value, ttlSeconds) {
    this.store.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  delete(key) {
    this.store.delete(key);
  }
}

// ============================================
// 가상의 느린 DB
// ============================================
const fakeDB = {
  users: {
    1: { id: 1, name: "홍길동", email: "hong@test.com" },
    2: { id: 2, name: "김영희", email: "kim@test.com" },
  },

  async findById(id) {
    // DB 조회를 시뮬레이션 (100ms 소요)
    await new Promise((r) => setTimeout(r, 100));
    return this.users[id] || null;
  },

  async update(id, data) {
    await new Promise((r) => setTimeout(r, 50));
    if (this.users[id]) {
      this.users[id] = { ...this.users[id], ...data };
      return this.users[id];
    }
    return null;
  },
};

// ============================================
// Cache-Aside 패턴 적용
// ============================================
const cache = new SimpleCache();
const CACHE_TTL = 60; // 60초

async function getUser(id) {
  const cacheKey = `user:${id}`;

  // 1. 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`  [HIT]  캐시에서 반환 (0ms)`);
    return cached;
  }

  // 2. 캐시 미스 → DB 조회
  console.log(`  [MISS] DB 조회 중...`);
  const start = Date.now();
  const user = await fakeDB.findById(id);
  const elapsed = Date.now() - start;
  console.log(`  [DB]   ${elapsed}ms 소요`);

  // 3. 캐시에 저장
  if (user) {
    cache.set(cacheKey, user, CACHE_TTL);
    console.log(`  [SET]  캐시 저장 (TTL: ${CACHE_TTL}초)`);
  }

  return user;
}

async function updateUser(id, data) {
  // 1. DB 업데이트
  const user = await fakeDB.update(id, data);

  // 2. 캐시 무효화 (중요!)
  cache.delete(`user:${id}`);
  console.log(`  [INVALIDATE] 캐시 삭제`);

  return user;
}

// ============================================
// 실행
// ============================================
async function main() {
  console.log("=== Cache-Aside 패턴 데모 ===\n");

  // 첫 번째 조회: 캐시 미스 → DB 조회
  console.log("1. 첫 번째 조회 (캐시 미스):");
  const user1 = await getUser(1);
  console.log(`   결과: ${JSON.stringify(user1)}\n`);

  // 두 번째 조회: 캐시 히트
  console.log("2. 두 번째 조회 (캐시 히트):");
  const user2 = await getUser(1);
  console.log(`   결과: ${JSON.stringify(user2)}\n`);

  // 데이터 수정 → 캐시 무효화
  console.log("3. 데이터 수정:");
  await updateUser(1, { name: "홍길동2" });
  console.log();

  // 수정 후 조회: 캐시 미스 → DB에서 최신 데이터
  console.log("4. 수정 후 조회 (캐시 무효화됨 → 다시 DB 조회):");
  const user3 = await getUser(1);
  console.log(`   결과: ${JSON.stringify(user3)}\n`);

  // 다시 조회: 캐시 히트
  console.log("5. 다시 조회 (캐시 히트):");
  const user4 = await getUser(1);
  console.log(`   결과: ${JSON.stringify(user4)}\n`);

  console.log("=== 핵심 정리 ===");
  console.log("1. 읽기: 캐시 → 없으면 DB → 캐시에 저장");
  console.log("2. 쓰기: DB 업데이트 → 캐시 삭제 (또는 갱신)");
  console.log("3. TTL: 캐시 만료 시간 설정으로 자동 갱신");
  console.log(
    "4. 주의: 캐시 무효화를 빠뜨리면 사용자가 옛날 데이터를 본다"
  );

  // ============================================
  // Cache Stampede (Thundering Herd) 문제
  // ============================================
  //
  // 문제 상황:
  //   인기 상품의 캐시 TTL이 만료되는 순간,
  //   수천 개의 요청이 동시에 캐시 미스를 겪고 전부 DB를 조회한다.
  //   → DB에 순간적으로 과부하 → 장애 발생 가능
  //
  // 예시:
  //   t=0     : 캐시에 인기 상품 데이터 저장 (TTL 60초)
  //   t=60    : 캐시 만료
  //   t=60.001: 요청 1000개가 동시에 캐시 미스 → DB 1000번 조회!
  //
  // 해결 방법:
  //
  // 1. Mutex/Lock (가장 일반적)
  //    - 캐시 미스 시 Lock 획득한 1개 요청만 DB 조회
  //    - 나머지 요청은 Lock 대기 후 갱신된 캐시에서 읽음
  //    - Redis: SETNX로 분산 Lock 구현
  //
  // 2. Pre-warming (사전 갱신)
  //    - TTL 만료 전에 미리 캐시를 갱신
  //    - 예: TTL 60초면, 50초 시점에 백그라운드에서 갱신
  //    - 캐시가 만료되는 순간이 없으므로 stampede 자체가 발생하지 않음
  //
  // 3. Staggered TTL (TTL 분산)
  //    - TTL에 랜덤 값을 더하여 만료 시점을 분산
  //    - 예: TTL = 60 + random(0, 10) → 60~70초 사이에 개별 만료
  //    - 모든 캐시가 동시에 만료되는 것을 방지
  //
  // 4. Probabilistic Early Expiration
  //    - 만료 시간이 가까워질수록 확률적으로 미리 갱신
  //    - 공식: shouldRefresh = (ttlRemaining < beta * log(random()))
  //    - 자연스럽게 부하가 분산됨
  //
  console.log("\n5. Cache Stampede(Thundering Herd) 주의:");
  console.log("   캐시 만료 시 수천 요청이 동시에 DB 조회 → 과부하");
  console.log("   해결: Mutex Lock, Pre-warming, Staggered TTL");
}

main();
