/**
 * 비동기 테스트 프레임워크 + 실전 예제
 * 실행: node async-test-demo.js
 *
 * test-runner.js의 미니 프레임워크를 확장하여
 * async/await 테스트를 지원한다.
 * 외부 의존성 없이 비동기 테스트의 원리를 직접 구현한다.
 */

// ============================================
// 비동기 미니 테스트 프레임워크
// ============================================
let passed = 0;
let failed = 0;
const suites = []; // describe 블록을 모아서 순차 실행

function describe(name, fn) {
  suites.push({ name, fn });
}

// it()이 async 함수도 받을 수 있도록 확장
const tests = [];
function it(name, fn) {
  tests.push({ name, fn });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`expected ${actual} < ${expected}`);
      }
    },
    // 비동기 함수의 reject를 검증
    async toReject(expectedMessage) {
      if (typeof actual !== "function") {
        throw new Error("toReject expects a function");
      }
      let threw = false;
      let caughtErr;
      try {
        await actual();
      } catch (err) {
        threw = true;
        caughtErr = err;
      }
      if (!threw) {
        throw new Error("expected function to reject, but it did not");
      }
      if (expectedMessage && !caughtErr.message.includes(expectedMessage)) {
        throw new Error(
          `expected error "${expectedMessage}", got "${caughtErr.message}"`
        );
      }
    },
  };
}

// 타임아웃 헬퍼: 테스트가 지정 시간 내에 완료되지 않으면 실패
function withTimeout(fn, ms) {
  return () => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`테스트 타임아웃: ${ms}ms 초과`));
      }, ms);

      Promise.resolve(fn())
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };
}

// 모든 describe/it을 순차 실행하는 러너
async function runAllTests() {
  for (const suite of suites) {
    tests.length = 0; // 각 describe 전에 초기화
    console.log(`\n${suite.name}`);
    suite.fn(); // it() 호출을 수집

    for (const test of tests) {
      try {
        await test.fn(); // async든 sync든 await 가능
        passed++;
        console.log(`  OK  ${test.name}`);
      } catch (err) {
        failed++;
        console.log(`  FAIL ${test.name}`);
        console.log(`       ${err.message}`);
      }
    }
  }
}

// ============================================
// 테스트 대상: 비동기 함수들
// ============================================

// 지연 후 데이터를 반환하는 함수 (API 호출 시뮬레이션)
function fetchUserData(userId, delayMs = 50) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const db = {
        1: { id: 1, name: "홍길동", email: "hong@test.com" },
        2: { id: 2, name: "김철수", email: "kim@test.com" },
      };
      const user = db[userId];
      if (user) {
        resolve(user);
      } else {
        reject(new Error(`유저 ${userId}을(를) 찾을 수 없습니다`));
      }
    }, delayMs);
  });
}

// 느린 작업 시뮬레이션
function slowOperation(delayMs = 300) {
  return new Promise((resolve) => {
    setTimeout(() => resolve("완료"), delayMs);
  });
}

// 비동기 유효성 검사 (DB 조회 시뮬레이션)
async function isUsernameAvailable(username) {
  await new Promise((r) => setTimeout(r, 30));
  const taken = ["admin", "root", "홍길동"];
  if (!username || username.length < 2) {
    throw new Error("사용자명은 2자 이상이어야 합니다");
  }
  return !taken.includes(username);
}

// ============================================
// 잘못된 방식 먼저: await를 빠뜨리면 생기는 문제
// ============================================

console.log("=== 비동기 테스트 데모 ===");

console.log("\n--- 잘못된 방식: await를 빠뜨린 테스트 ---");
console.log("  다음과 같이 await를 빼면 테스트가 항상 통과한다:\n");
console.log("  it('유저를 조회한다', () => {            // async 빠짐!");
console.log("    const user = fetchUserData(999);       // await 빠짐!");
console.log("    expect(user.name).toBe('홍길동');      // user는 Promise 객체");
console.log("  });                                      // → Promise는 truthy라 에러 안 남");
console.log("");
console.log("  이유: Promise 객체 자체에 .name을 하면 'Promise'라는 문자열이 나온다.");
console.log("  expect('Promise').toBe('홍길동')은 에러를 던지지만,");
console.log("  it()이 async가 아니면 그 에러가 unhandled rejection이 되어 묻힌다.");
console.log("");
console.log("  결론: 비동기 테스트에서는 반드시 async/await를 사용하라.\n");

// 실제로 잘못된 패턴이 어떻게 되는지 보여주기
(async () => {
  // 동기 it()으로 비동기 함수를 테스트 — 에러가 감지되지 않는 상황 시뮬레이션
  console.log("  시뮬레이션: 동기 테스트 러너로 비동기 코드를 테스트하면?");

  let syncPassed = 0;
  function syncIt(name, fn) {
    try {
      fn(); // await 없이 실행 — Promise의 reject를 못 잡는다
      syncPassed++;
      console.log(`    OK  ${name}  ← 실제로는 틀린 테스트인데 통과!`);
    } catch (err) {
      console.log(`    FAIL ${name}`);
    }
  }

  syncIt("존재하지 않는 유저를 조회하면 reject되어야 한다", () => {
    // await 없이 호출 — reject가 발생하지만 동기 try/catch에 안 잡힘
    fetchUserData(999);
    // 이 줄까지 에러 없이 도달 → 테스트 "통과"
  });

  console.log(`    동기 러너 결과: ${syncPassed}개 통과 (잘못된 결과!)\n`);

  // unhandled rejection 에러가 콘솔에 찍히지 않도록 임시 핸들러
  const suppressHandler = () => {};
  process.on("unhandledRejection", suppressHandler);
  await new Promise((r) => setTimeout(r, 100)); // reject가 처리될 시간
  process.removeListener("unhandledRejection", suppressHandler);

  // ============================================
  // 올바른 방식: 비동기 테스트 프레임워크 사용
  // ============================================

  console.log("--- 올바른 방식: async 테스트 프레임워크 사용 ---");

  // --- 비동기 함수 테스트 ---
  describe("fetchUserData (비동기 함수 테스트)", () => {
    it("존재하는 유저를 반환한다", async () => {
      const user = await fetchUserData(1);
      expect(user.name).toBe("홍길동");
      expect(user.email).toBe("hong@test.com");
    });

    it("여러 유저를 조회할 수 있다", async () => {
      const [user1, user2] = await Promise.all([
        fetchUserData(1),
        fetchUserData(2),
      ]);
      expect(user1.name).toBe("홍길동");
      expect(user2.name).toBe("김철수");
    });
  });

  // --- reject 검증 테스트 ---
  describe("비동기 에러(reject) 검증", () => {
    it("존재하지 않는 유저 조회 시 reject된다", async () => {
      await expect(() => fetchUserData(999)).toReject("찾을 수 없습니다");
    });

    it("유효하지 않은 사용자명에 에러를 던진다", async () => {
      await expect(() => isUsernameAvailable("")).toReject("2자 이상");
    });

    it("이미 사용 중인 이름을 감지한다", async () => {
      const available = await isUsernameAvailable("admin");
      expect(available).toBe(false);
    });

    it("사용 가능한 이름을 확인한다", async () => {
      const available = await isUsernameAvailable("newuser");
      expect(available).toBe(true);
    });
  });

  // --- 타임아웃 테스트 ---
  describe("타임아웃 테스트", () => {
    it(
      "빠른 작업은 타임아웃 내에 완료된다 (100ms 제한)",
      withTimeout(async () => {
        const user = await fetchUserData(1, 30); // 30ms 지연
        expect(user.name).toBe("홍길동");
      }, 100)
    );

    it(
      "느린 작업은 타임아웃으로 실패한다 (50ms 제한)",
      withTimeout(async () => {
        await slowOperation(200); // 200ms 지연 → 50ms 제한 초과
      }, 50)
    );

    it(
      "적절한 타임아웃은 통과한다 (500ms 제한)",
      withTimeout(async () => {
        const result = await slowOperation(100); // 100ms 지연
        expect(result).toBe("완료");
      }, 500)
    );
  });

  // --- 테스트 실행 ---
  await runAllTests();

  // ============================================
  // 결과
  // ============================================
  console.log(`\n${"=".repeat(40)}`);
  console.log(`결과: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("\n위 FAIL 항목은 의도된 실패입니다 (타임아웃 초과 테스트).");
  }
  console.log("\n비동기 테스트는 의도대로 동작합니다!");

  console.log(`\n${"=".repeat(40)}`);
  console.log("핵심 정리:");
  console.log("1. 비동기 테스트에서 async/await를 빼면 false positive가 발생한다");
  console.log("2. reject 검증에는 toReject 같은 비동기 matcher가 필요하다");
  console.log("3. 타임아웃을 설정하면 무한 대기를 방지할 수 있다");
  console.log("4. Promise.all로 여러 비동기 작업을 동시에 테스트할 수 있다");
  console.log("5. 테스트 러너가 await를 지원하는지 반드시 확인하라");
})();
