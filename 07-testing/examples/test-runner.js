/**
 * 미니 테스트 프레임워크 + 실전 테스트 예제
 * 실행: node test-runner.js
 *
 * Jest/Vitest가 내부적으로 하는 일을 이해하기 위한 예제.
 * 외부 의존성 없이 테스트의 원리를 직접 구현한다.
 */

// ============================================
// 미니 테스트 프레임워크
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
    // 주의: JSON.stringify 비교는 한계가 있다
    // - 키 순서가 다르면 실패 ({a:1, b:2} !== {b:2, a:1})
    // - Date 객체, undefined 값, 순환 참조를 올바르게 처리하지 못한다
    // - 실무에서는 deep-equal 라이브러리나 테스트 프레임워크의 내장 matcher를 사용하라
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toThrow(expectedMessage) {
      if (typeof actual !== "function") {
        throw new Error("toThrow expects a function");
      }
      let threw = false;
      let caughtErr;
      try {
        actual();
      } catch (err) {
        threw = true;
        caughtErr = err;
      }
      if (!threw) {
        throw new Error("expected function to throw, but it did not");
      }
      if (expectedMessage && !caughtErr.message.includes(expectedMessage)) {
        throw new Error(
          `expected error "${expectedMessage}", got "${caughtErr.message}"`
        );
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`expected ${actual} > ${expected}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(
          `expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`
        );
      }
    },
  };
}

// ============================================
// 테스트 대상: 간단한 비즈니스 로직
// ============================================

// 이메일 검증
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// 할인 계산
function calculateDiscount(price, discountPercent) {
  if (typeof price !== "number" || price < 0) {
    throw new Error("가격은 0 이상의 숫자여야 합니다");
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("할인율은 0~100 사이여야 합니다");
  }
  return Math.round(price * (1 - discountPercent / 100));
}

// 장바구니
function createCart() {
  const items = [];

  return {
    add(item) {
      if (!item.name || !item.price || item.price <= 0) {
        throw new Error("유효하지 않은 상품입니다");
      }
      const existing = items.find((i) => i.name === item.name);
      if (existing) {
        existing.quantity += item.quantity || 1;
      } else {
        items.push({ ...item, quantity: item.quantity || 1 });
      }
    },
    getItems() {
      return [...items];
    },
    getTotal() {
      return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    },
    clear() {
      items.length = 0;
    },
  };
}

// ============================================
// 테스트 실행
// ============================================

console.log("=== 테스트 실행 ===");

// --- 단위 테스트: 이메일 검증 ---
describe("isValidEmail", () => {
  // AAA 패턴: Arrange(준비) → Act(실행) → Assert(검증)

  it("유효한 이메일을 통과시킨다", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.name@domain.co.kr")).toBe(true);
  });

  it("유효하지 않은 이메일을 거부한다", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@missing-local.com")).toBe(false);
    expect(isValidEmail("missing-domain@")).toBe(false);
  });

  it("문자열이 아닌 입력을 거부한다", () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });

  // 경계값 테스트 — 흔히 놓치는 케이스
  it("공백이 포함된 이메일을 거부한다", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail(" user@example.com")).toBe(false);
  });
});

// --- 단위 테스트: 할인 계산 ---
describe("calculateDiscount", () => {
  it("정상적인 할인을 계산한다", () => {
    expect(calculateDiscount(10000, 10)).toBe(9000);
    expect(calculateDiscount(10000, 50)).toBe(5000);
    expect(calculateDiscount(10000, 0)).toBe(10000);
    expect(calculateDiscount(10000, 100)).toBe(0);
  });

  it("소수점을 반올림한다", () => {
    expect(calculateDiscount(1000, 33)).toBe(670); // 1000 * 0.67 = 670
  });

  // 에러 케이스 — AI가 자주 빠뜨리는 부분
  it("음수 가격에 에러를 던진다", () => {
    expect(() => calculateDiscount(-1000, 10)).toThrow("0 이상");
  });

  it("범위 밖 할인율에 에러를 던진다", () => {
    expect(() => calculateDiscount(1000, -10)).toThrow("0~100");
    expect(() => calculateDiscount(1000, 150)).toThrow("0~100");
  });

  it("숫자가 아닌 가격에 에러를 던진다", () => {
    expect(() => calculateDiscount("1000", 10)).toThrow("숫자");
  });
});

// --- 통합 테스트: 장바구니 ---
describe("Cart (통합 테스트)", () => {
  it("상품을 추가하고 총액을 계산한다", () => {
    // Arrange
    const cart = createCart();

    // Act
    cart.add({ name: "키보드", price: 50000 });
    cart.add({ name: "마우스", price: 30000 });

    // Assert
    expect(cart.getItems().length).toBe(2);
    expect(cart.getTotal()).toBe(80000);
  });

  it("같은 상품을 추가하면 수량이 증가한다", () => {
    const cart = createCart();
    cart.add({ name: "키보드", price: 50000 });
    cart.add({ name: "키보드", price: 50000 });

    expect(cart.getItems().length).toBe(1);
    expect(cart.getItems()[0].quantity).toBe(2);
    expect(cart.getTotal()).toBe(100000);
  });

  it("유효하지 않은 상품을 거부한다", () => {
    const cart = createCart();
    expect(() => cart.add({ name: "", price: 1000 })).toThrow("유효하지 않은");
    expect(() => cart.add({ name: "키보드", price: -100 })).toThrow("유효하지 않은");
  });

  it("장바구니를 비운다", () => {
    const cart = createCart();
    cart.add({ name: "키보드", price: 50000 });
    cart.clear();

    expect(cart.getItems().length).toBe(0);
    expect(cart.getTotal()).toBe(0);
  });
});

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
console.log("1. 정상 케이스뿐 아니라 에러 케이스도 테스트하라");
console.log("2. 경계값(0, 빈 문자열, null, 음수)을 반드시 테스트하라");
console.log("3. AI가 만든 코드에는 '입력 검증 테스트'부터 추가하라");
console.log("4. 테스트는 문서다 — 코드가 뭘 해야 하는지 명세서 역할");
