/**
 * Race Condition 체험 데모
 * 실행: node race-condition-demo.js
 *
 * 재고 관리에서 동시 요청이 발생할 때 무슨 일이 생기는지 직접 확인한다.
 *
 * 주의: JS는 싱글 스레드라 "진짜" 동시 접근은 아니지만,
 * 비동기 I/O 사이에 제어가 넘어가면서 동일한 문제가 발생한다.
 * 실무에서는 서버가 여러 인스턴스로 실행되거나,
 * DB 트랜잭션 격리 수준에 따라 더 심각하게 터진다.
 */

console.log("=== Race Condition 데모 ===\n");

// ============================================
// 1. 문제 상황: 동시 구매
// ============================================
async function unsafeDemo() {
  console.log("=== 1. 안전하지 않은 재고 차감 ===\n");

  let stock = 1; // 재고 1개
  let salesCount = 0;

  async function purchase(buyer) {
    // 비동기 지연 시뮬레이션 (DB 조회 시간)
    const currentStock = stock;
    await new Promise((r) => setTimeout(r, Math.random() * 10));

    if (currentStock > 0) {
      // 또 다른 비동기 지연 (DB 업데이트 시간)
      await new Promise((r) => setTimeout(r, Math.random() * 10));
      stock = currentStock - 1;
      salesCount++;
      console.log(`  ${buyer}: 구매 성공! (재고 읽은 시점: ${currentStock})`);
    } else {
      console.log(`  ${buyer}: 재고 부족으로 실패`);
    }
  }

  // 5명이 동시에 구매 시도
  console.log("재고: 1개");
  console.log("5명이 동시에 구매 시도...\n");

  await Promise.all([
    purchase("구매자A"),
    purchase("구매자B"),
    purchase("구매자C"),
    purchase("구매자D"),
    purchase("구매자E"),
  ]);

  console.log(`\n결과: ${salesCount}명이 구매 성공 (재고 1개였는데!)`);
  console.log(`남은 재고: ${stock}`);
  if (salesCount > 1) {
    console.log("→ Race Condition 발생! 재고보다 많이 판매됨\n");
  }
}

// ============================================
// 2. 해결: 뮤텍스(Lock) 사용
// ============================================
async function safeDemo() {
  console.log("=== 2. Lock을 사용한 안전한 재고 차감 ===\n");

  let stock = 1;
  let salesCount = 0;

  // 간단한 뮤텍스 구현
  class Mutex {
    constructor() {
      this.locked = false;
      this.queue = [];
    }

    async acquire() {
      if (!this.locked) {
        this.locked = true;
        return;
      }
      // 이미 잠겨있으면 대기열에 추가
      return new Promise((resolve) => {
        this.queue.push(resolve);
      });
    }

    release() {
      if (this.queue.length > 0) {
        // 대기 중인 다음 요청을 실행
        const next = this.queue.shift();
        next();
      } else {
        this.locked = false;
      }
    }
  }

  const mutex = new Mutex();

  async function safePurchase(buyer) {
    await mutex.acquire(); // 잠금 획득 (다른 요청은 대기)

    try {
      await new Promise((r) => setTimeout(r, Math.random() * 10));

      if (stock > 0) {
        await new Promise((r) => setTimeout(r, Math.random() * 10));
        stock--;
        salesCount++;
        console.log(`  ${buyer}: 구매 성공!`);
      } else {
        console.log(`  ${buyer}: 재고 부족으로 실패`);
      }
    } finally {
      mutex.release(); // 반드시 잠금 해제
    }
  }

  console.log("재고: 1개");
  console.log("5명이 동시에 구매 시도 (Lock 적용)...\n");

  await Promise.all([
    safePurchase("구매자A"),
    safePurchase("구매자B"),
    safePurchase("구매자C"),
    safePurchase("구매자D"),
    safePurchase("구매자E"),
  ]);

  console.log(`\n결과: ${salesCount}명만 구매 성공`);
  console.log(`남은 재고: ${stock}`);
  console.log("→ Lock 덕분에 정확히 1명만 구매 성공\n");
}

// ============================================
// 3. 실무에서의 해결 방법
// ============================================
function showPracticalSolutions() {
  console.log("=== 3. 실무 해결 방법 ===\n");

  console.log("DB 레벨 (가장 확실):");
  console.log("  -- 원자적 업데이트");
  console.log("  UPDATE products SET stock = stock - 1");
  console.log("  WHERE id = 1 AND stock > 0;");
  console.log("  -- 영향받은 행이 0이면 재고 부족\n");

  console.log("  -- 비관적 락");
  console.log("  SELECT * FROM products WHERE id = 1 FOR UPDATE;");
  console.log("  -- 다른 트랜잭션은 이 행을 수정할 수 없음\n");

  console.log("  -- 낙관적 락");
  console.log("  UPDATE products SET stock = stock - 1, version = version + 1");
  console.log("  WHERE id = 1 AND version = 5;");
  console.log("  -- version이 안 맞으면 재시도\n");

  console.log("Redis 레벨:");
  console.log("  WATCH product:1:stock");
  console.log("  MULTI");
  console.log("  DECRBY product:1:stock 1");
  console.log("  EXEC");
  console.log("  -- WATCH된 키가 변경되면 EXEC 실패\n");

  console.log("프론트엔드 레벨 (보조):");
  console.log("  - 버튼 클릭 후 disable 처리");
  console.log("  - 디바운스/쓰로틀 적용");
  console.log("  - 멱등성 키(Idempotency Key) 전송");
}

async function main() {
  await unsafeDemo();
  await safeDemo();
  showPracticalSolutions();
}

main();
