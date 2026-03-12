/**
 * 모킹(Mocking) / 스파이(Spy) 유틸리티 직접 구현 + 실전 예제
 * 실행: node mock-demo.js
 *
 * 실제 API를 호출하면 테스트가 느리고, 불안정하고, 비용이 든다.
 * 모킹을 직접 구현하면서 Jest의 jest.fn()이 내부적으로 하는 일을 이해한다.
 * 외부 의존성 없이 구현한다.
 */

// ============================================
// 미니 테스트 프레임워크 (test-runner.js에서 가져온 구조)
// ============================================
let passed = 0;
let failed = 0;

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  OK  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
  }
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
  };
}

// ============================================
// 1. Mock / Spy / Stub 직접 구현
// ============================================
console.log("=== 모킹(Mocking) 데모 ===");

console.log("\n--- 모킹 유틸리티 구현 ---\n");

/**
 * createMock(fn) — 원본 함수를 감싸서 호출 정보를 기록한다.
 * Jest의 jest.fn(implementation)과 동일한 역할.
 */
function createMock(fn) {
  const mock = function (...args) {
    const result = fn ? fn(...args) : undefined;
    mock.calls.push(args);
    mock.results.push(result);
    mock.callCount++;
    return result;
  };

  mock.calls = [];       // 각 호출의 인자 목록
  mock.results = [];     // 각 호출의 반환값
  mock.callCount = 0;    // 호출 횟수

  // 검증 헬퍼 메서드
  mock.wasCalledWith = function (...expectedArgs) {
    return mock.calls.some(
      (callArgs) => JSON.stringify(callArgs) === JSON.stringify(expectedArgs)
    );
  };

  mock.reset = function () {
    mock.calls = [];
    mock.results = [];
    mock.callCount = 0;
  };

  return mock;
}

/**
 * createStub(returnValue) — 항상 고정된 값을 반환하는 함수.
 * 외부 의존성을 제거할 때 사용.
 */
function createStub(returnValue) {
  return createMock(() => returnValue);
}

console.log("createMock(fn) — 원본 함수를 감싸서 호출 기록을 추적");
console.log("  mock.calls       → 각 호출의 인자 배열");
console.log("  mock.results     → 각 호출의 반환값 배열");
console.log("  mock.callCount   → 총 호출 횟수");
console.log("  mock.wasCalledWith(...args) → 특정 인자로 호출되었는지 확인\n");
console.log("createStub(value) — 항상 고정된 값을 반환하는 mock 생성\n");

// ============================================
// 2. 왜 모킹이 필요한가 (나쁜 방식 먼저)
// ============================================

console.log("--- 왜 모킹이 필요한가? ---\n");

console.log("잘못된 방식 — 실제 외부 서비스를 호출하는 테스트:");
console.log("  function testPayment() {");
console.log("    const result = callPaymentAPI(1000); // 실제 결제 발생!");
console.log("    expect(result.success).toBe(true);");
console.log("  }");
console.log("");
console.log("  문제점:");
console.log("  - 실제 API를 호출하면 테스트가 느리고, 불안정하고, 비용이 든다");
console.log("  - 네트워크 상태에 따라 테스트가 실패할 수 있다");
console.log("  - 테스트할 때마다 실제 결제가 발생한다 (!)\n");

console.log("올바른 방식 — 외부 서비스를 mock으로 대체:");
console.log("  const mockPaymentAPI = createStub({ success: true, id: 'pay_123' });");
console.log("  const result = processOrder(mockPaymentAPI, 1000);");
console.log("  → 빠르고, 안정적이고, 무료\n");

// ============================================
// 3. 실전 테스트: 주문 처리 시스템
// ============================================

// --- 테스트 대상: 주문 처리 ---
function processOrder(paymentService, notificationService, order) {
  // 1. 가격 계산
  const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (total <= 0) {
    return { success: false, error: "주문 금액이 0 이하입니다" };
  }

  // 2. 결제 시도
  const paymentResult = paymentService.charge(total, order.userId);

  if (!paymentResult.success) {
    return { success: false, error: "결제 실패" };
  }

  // 3. 알림 전송
  notificationService.send(
    order.userId,
    `주문이 완료되었습니다. 금액: ${total}원`
  );

  return {
    success: true,
    paymentId: paymentResult.id,
    total,
  };
}

describe("processOrder (모킹 테스트)", () => {
  // 각 테스트마다 새 mock 생성
  function createMockServices() {
    return {
      payment: {
        charge: createMock((amount, userId) => ({
          success: true,
          id: "pay_mock_001",
        })),
      },
      notification: {
        send: createMock((userId, message) => true),
      },
    };
  }

  it("정상 주문을 처리한다", () => {
    // Arrange
    const services = createMockServices();
    const order = {
      userId: "user_1",
      items: [
        { name: "키보드", price: 50000, quantity: 1 },
        { name: "마우스", price: 30000, quantity: 2 },
      ],
    };

    // Act
    const result = processOrder(services.payment, services.notification, order);

    // Assert
    expect(result.success).toBe(true);
    expect(result.total).toBe(110000);
    expect(result.paymentId).toBe("pay_mock_001");
  });

  it("결제 서비스에 올바른 금액을 전달한다 (인자 검증)", () => {
    const services = createMockServices();
    const order = {
      userId: "user_1",
      items: [{ name: "키보드", price: 50000, quantity: 1 }],
    };

    processOrder(services.payment, services.notification, order);

    // mock이 올바른 인자로 호출되었는지 검증
    expect(services.payment.charge.wasCalledWith(50000, "user_1")).toBe(true);
  });

  it("알림 서비스가 정확히 1번 호출된다 (호출 횟수 검증)", () => {
    const services = createMockServices();
    const order = {
      userId: "user_1",
      items: [{ name: "키보드", price: 50000, quantity: 1 }],
    };

    processOrder(services.payment, services.notification, order);

    expect(services.notification.send.callCount).toBe(1);
  });

  it("결제 실패 시 알림을 보내지 않는다", () => {
    const services = createMockServices();
    // 결제 실패하도록 mock 변경
    services.payment.charge = createMock(() => ({ success: false }));
    const order = {
      userId: "user_1",
      items: [{ name: "키보드", price: 50000, quantity: 1 }],
    };

    const result = processOrder(services.payment, services.notification, order);

    expect(result.success).toBe(false);
    expect(services.notification.send.callCount).toBe(0); // 알림 안 보냄
  });

  it("금액 0 이하일 때 결제를 시도하지 않는다", () => {
    const services = createMockServices();
    const order = {
      userId: "user_1",
      items: [{ name: "무료 샘플", price: 0, quantity: 1 }],
    };

    const result = processOrder(services.payment, services.notification, order);

    expect(result.success).toBe(false);
    expect(services.payment.charge.callCount).toBe(0); // 결제 시도 안 함
  });
});

// ============================================
// 4. Stub 활용: 외부 데이터 소스 대체
// ============================================

// --- 테스트 대상: 유저 프로필 조회 ---
function getUserProfile(dbQuery, userId) {
  const user = dbQuery(`SELECT * FROM users WHERE id = '${userId}'`);
  if (!user) return null;

  return {
    displayName: user.name,
    memberSince: user.createdAt,
    isVIP: user.totalSpent > 1000000,
  };
}

describe("getUserProfile (스텁 테스트)", () => {
  it("일반 유저 프로필을 올바르게 반환한다", () => {
    // DB 조회를 stub으로 대체
    const stubQuery = createStub({
      name: "김철수",
      createdAt: "2024-01-15",
      totalSpent: 500000,
    });

    const profile = getUserProfile(stubQuery, "user_1");

    expect(profile.displayName).toBe("김철수");
    expect(profile.isVIP).toBe(false);
  });

  it("VIP 유저를 올바르게 판별한다", () => {
    const stubQuery = createStub({
      name: "이부자",
      createdAt: "2020-03-01",
      totalSpent: 5000000,
    });

    const profile = getUserProfile(stubQuery, "user_vip");

    expect(profile.isVIP).toBe(true);
  });

  it("존재하지 않는 유저에 null을 반환한다", () => {
    const stubQuery = createStub(null);

    const profile = getUserProfile(stubQuery, "unknown");

    expect(profile).toBe(null);
  });

  it("DB에 전달된 쿼리를 검증할 수 있다", () => {
    const stubQuery = createStub({ name: "테스트", createdAt: "2024-01-01", totalSpent: 0 });

    getUserProfile(stubQuery, "user_42");

    // mock이기도 하므로 호출 인자를 검증할 수 있다
    expect(stubQuery.calls[0][0]).toBe("SELECT * FROM users WHERE id = 'user_42'");
  });
});

// ============================================
// 5. 콜백 감시: 이벤트 핸들러 테스트
// ============================================

function createEventEmitter() {
  const listeners = {};

  return {
    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },
    emit(event, ...args) {
      const handlers = listeners[event] || [];
      handlers.forEach((fn) => fn(...args));
    },
  };
}

describe("EventEmitter (스파이 테스트)", () => {
  it("이벤트 핸들러가 올바른 인자와 함께 호출된다", () => {
    const emitter = createEventEmitter();
    const spy = createMock((data) => data);

    emitter.on("order:complete", spy);
    emitter.emit("order:complete", { orderId: "ORD_001", total: 50000 });

    expect(spy.callCount).toBe(1);
    expect(spy.wasCalledWith({ orderId: "ORD_001", total: 50000 })).toBe(true);
  });

  it("같은 이벤트에 여러 핸들러를 등록할 수 있다", () => {
    const emitter = createEventEmitter();
    const spy1 = createMock();
    const spy2 = createMock();

    emitter.on("user:login", spy1);
    emitter.on("user:login", spy2);
    emitter.emit("user:login", "user_1");

    expect(spy1.callCount).toBe(1);
    expect(spy2.callCount).toBe(1);
  });

  it("등록하지 않은 이벤트는 핸들러를 호출하지 않는다", () => {
    const emitter = createEventEmitter();
    const spy = createMock();

    emitter.on("order:complete", spy);
    emitter.emit("order:cancel", { orderId: "ORD_001" });

    expect(spy.callCount).toBe(0);
  });
});

// ============================================
// 6. 모킹하면 안 되는 경우
// ============================================
console.log("\n--- 모킹하면 안 되는 경우 ---\n");

console.log("모킹이 적절한 경우:");
console.log("  - 외부 API 호출 (결제, 이메일, SMS 등)");
console.log("  - 네트워크 요청");
console.log("  - 파일 시스템 접근 (테스트 환경에 파일이 없을 수 있음)");
console.log("  - 현재 시간 (Date.now) — 테스트 결과가 매번 달라지니까\n");

console.log("모킹하면 안 되는 경우:");
console.log("  - DB 쿼리를 모킹하면 실제 쿼리 오류를 못 잡는다");
console.log("    → 잘못된 SQL, 누락된 인덱스, 타입 불일치 등");
console.log("    → 통합 테스트에서는 실제 DB(테스트용)를 사용하라");
console.log("  - 테스트 대상 자체를 모킹하면 의미가 없다");
console.log("    → mock된 함수가 올바르게 동작하는지 테스트하는 꼴");
console.log("  - 너무 많이 모킹하면 실제 동작과 동떨어진 테스트가 된다");
console.log("    → '모든 테스트가 통과하는데 프로덕션에서 터진다'");

// ============================================
// 결과
// ============================================
console.log(`\n${"=".repeat(40)}`);
console.log(`결과: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFAILED 테스트를 확인하세요.");
  process.exit(1);
}
console.log("\n모든 테스트 통과!");

console.log(`\n${"=".repeat(40)}`);
console.log("핵심 정리:");
console.log("1. createMock(fn)으로 호출 기록을 추적하라 (jest.fn()의 원리)");
console.log("2. createStub(value)으로 외부 의존성을 고정값으로 대체하라");
console.log("3. 인자 검증 + 호출 횟수 검증으로 '올바르게 호출했는지' 확인하라");
console.log("4. 외부 API는 모킹, DB는 통합 테스트에서 실제로 테스트하라");
console.log("5. 모킹은 '무엇을 호출했는가'를 테스트하고, 단위 테스트는 '무엇을 반환하는가'를 테스트한다");
