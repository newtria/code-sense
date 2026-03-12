/**
 * Deadlock(교착 상태) 시뮬레이션 데모
 * 실행: node deadlock-demo.js
 *
 * 두 프로세스가 각각 자원을 하나 잡고, 상대방의 자원을 기다리면
 * 영원히 진행되지 않는 교착 상태에 빠진다.
 *
 * JS는 싱글 스레드이므로 "진짜" OS 수준 데드락은 발생하지 않지만,
 * 비동기 Lock 획득 패턴에서 동일한 교착 구조가 만들어진다.
 * 실무에서는 DB 트랜잭션 간 교착, 분산 락 교착 등으로 나타난다.
 */

// ============================================
// 비동기 Lock (Mutex) 구현
// ============================================
class Lock {
  constructor(name) {
    this.name = name;
    this.locked = false;
    this.queue = [];
  }

  acquire(requester) {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        console.log(`  [${requester}] ${this.name} 획득`);
        resolve();
      } else {
        console.log(`  [${requester}] ${this.name} 대기 중...`);
        this.queue.push({ resolve, requester });
      }
    });
  }

  release(requester) {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      console.log(`  [${next.requester}] ${this.name} 획득 (대기 해제)`);
      next.resolve();
    } else {
      this.locked = false;
    }
    console.log(`  [${requester}] ${this.name} 반납`);
  }
}

// ============================================
// 1. 데드락 발생 시나리오
// ============================================
async function deadlockDemo() {
  console.log("=== 1. 데드락 발생 ===\n");
  console.log("시나리오: 계좌 이체");
  console.log("  프로세스A: 계좌1 → 계좌2 이체 (계좌1 락 → 계좌2 락 순서)");
  console.log("  프로세스B: 계좌2 → 계좌1 이체 (계좌2 락 → 계좌1 락 순서)");
  console.log("  → 서로 다른 순서로 Lock을 잡으면 교착 상태!\n");

  const account1Lock = new Lock("계좌1-Lock");
  const account2Lock = new Lock("계좌2-Lock");

  let deadlockDetected = false;

  // 데드락 감지 타이머 (실무에서는 DB wait-for graph 또는 타임아웃으로 감지)
  const deadlockTimer = setTimeout(() => {
    deadlockDetected = true;
    console.log("\n  [감지] 데드락 발생! (2초 타임아웃)");
    console.log("  프로세스A: 계좌1-Lock 보유, 계좌2-Lock 대기");
    console.log("  프로세스B: 계좌2-Lock 보유, 계좌1-Lock 대기");
    console.log("  → 서로가 서로를 기다리며 영원히 진행 불가\n");
  }, 2000);

  // 프로세스A: 계좌1 → 계좌2 순서로 Lock 획득 시도
  const processA = async () => {
    await account1Lock.acquire("프로세스A");
    // 약간의 지연 — 이 사이에 프로세스B가 계좌2를 잡는다
    await new Promise((r) => setTimeout(r, 50));

    if (deadlockDetected) return; // 데드락 감지 시 탈출

    // 이 acquire는 영원히 기다린다 (프로세스B가 계좌2를 잡고 있으므로)
    const acquirePromise = account2Lock.acquire("프로세스A");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("타임아웃")), 2500)
    );

    try {
      await Promise.race([acquirePromise, timeoutPromise]);
    } catch {
      // 타임아웃으로 탈출
    }
  };

  // 프로세스B: 계좌2 → 계좌1 순서로 Lock 획득 시도 (반대 순서!)
  const processB = async () => {
    await account2Lock.acquire("프로세스B");
    await new Promise((r) => setTimeout(r, 50));

    if (deadlockDetected) return;

    const acquirePromise = account1Lock.acquire("프로세스B");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("타임아웃")), 2500)
    );

    try {
      await Promise.race([acquirePromise, timeoutPromise]);
    } catch {
      // 타임아웃으로 탈출
    }
  };

  await Promise.all([processA(), processB()]);
  clearTimeout(deadlockTimer);
}

// ============================================
// 2. 해결: 일관된 Lock 순서
// ============================================
async function consistentOrderDemo() {
  console.log("=== 2. 해결: 일관된 Lock 순서 ===\n");
  console.log("규칙: 항상 ID가 작은 계좌의 Lock을 먼저 획득한다.");
  console.log("  프로세스A: 계좌1 → 계좌2 (1 < 2이므로 계좌1 먼저)");
  console.log("  프로세스B: 계좌1 → 계좌2 (동일한 순서로 통일!)\n");

  const account1Lock = new Lock("계좌1-Lock");
  const account2Lock = new Lock("계좌2-Lock");

  let account1Balance = 10000;
  let account2Balance = 5000;

  async function safeTransfer(from, to, amount, processName) {
    // 항상 ID가 작은 계좌의 Lock을 먼저 획득 (데드락 방지)
    // from=1,to=2든 from=2,to=1이든 무조건 계좌1-Lock → 계좌2-Lock 순서
    const lockOrder = [from, to].sort((a, b) => a - b);
    const lockMap = { 1: account1Lock, 2: account2Lock };
    const firstLock = lockMap[lockOrder[0]];
    const secondLock = lockMap[lockOrder[1]];

    await firstLock.acquire(processName);
    // 지연 시뮬레이션 — 데드락 없이 잘 동작하는지 확인
    await new Promise((r) => setTimeout(r, 50));
    await secondLock.acquire(processName);

    // 이체 실행 (두 Lock을 모두 잡은 상태)
    if (from === 1) {
      account1Balance -= amount;
      account2Balance += amount;
    } else {
      account2Balance -= amount;
      account1Balance += amount;
    }
    console.log(`  [${processName}] 계좌${from} → 계좌${to}: ${amount}원 이체 완료`);
    console.log(`  [${processName}] 잔액: 계좌1=${account1Balance}원, 계좌2=${account2Balance}원`);

    secondLock.release(processName);
    firstLock.release(processName);
  }

  console.log(`초기 잔액: 계좌1=${account1Balance}원, 계좌2=${account2Balance}원\n`);

  await Promise.all([
    safeTransfer(1, 2, 3000, "프로세스A"), // 계좌1 → 계좌2
    safeTransfer(2, 1, 1000, "프로세스B"), // 계좌2 → 계좌1 (하지만 Lock은 같은 순서)
  ]);

  console.log(`\n최종 잔액: 계좌1=${account1Balance}원, 계좌2=${account2Balance}원`);
  console.log("→ 데드락 없이 두 이체 모두 정상 완료!\n");
}

// ============================================
// 실행
// ============================================
async function main() {
  console.log("=== Deadlock(교착 상태) 데모 ===\n");

  await deadlockDemo();
  await consistentOrderDemo();

  console.log("=== 핵심 정리 ===\n");
  console.log("데드락 4가지 필요 조건 (하나만 깨면 데드락 방지):");
  console.log("  1. 상호 배제   — 자원을 한 번에 하나만 사용");
  console.log("  2. 점유와 대기 — 자원을 잡은 채 다른 자원 대기");
  console.log("  3. 비선점      — 강제로 뺏을 수 없음");
  console.log("  4. 순환 대기   — A→B, B→A 순환 구조\n");

  console.log("해결 방법:");
  console.log("  1. Lock 순서 통일 (순환 대기 제거) ← 가장 실용적");
  console.log("  2. 타임아웃 설정 (데드락 감지 후 재시도)");
  console.log("  3. 한 번에 모든 Lock 획득 (점유와 대기 제거)\n");

  console.log("실무 사례:");
  console.log("  - DB: SELECT ... FOR UPDATE로 여러 행을 잠글 때");
  console.log("    → 항상 PK 오름차순으로 잠그면 데드락 방지");
  console.log("  - Redis 분산 락: Redlock 알고리즘");
  console.log("    → 타임아웃 + 순서 통일로 데드락 방지");
  console.log("  - MySQL: innodb_lock_wait_timeout으로 자동 감지/롤백");
}

main();
