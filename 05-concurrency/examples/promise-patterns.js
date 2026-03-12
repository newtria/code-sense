/**
 * Promise 패턴 비교: all vs allSettled vs race vs any
 * 실행: node promise-patterns.js
 *
 * "3개 API를 동시에 호출할 때 어떤 패턴을 써야 하는가?"
 * 각 패턴의 동작 차이를 직접 확인한다.
 */

// ============================================
// 가상 API 호출 함수
// ============================================
function fakeApi(name, ms, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error(`${name} 실패 (${ms}ms)`));
      } else {
        resolve(`${name} 성공 (${ms}ms)`);
      }
    }, ms);
  });
}

// ============================================
// Quiz 1: Promise.all — 하나라도 실패하면?
// ============================================
async function quiz1_promiseAll() {
  console.log("=== Quiz 1: Promise.all ===\n");
  console.log("예측해보세요: 3개 중 1개가 실패하면 나머지 결과는?\n");
  console.log("코드:");
  console.log("  Promise.all([");
  console.log('    fakeApi("유저API", 50),         // 성공');
  console.log('    fakeApi("주문API", 30, true),    // 실패!');
  console.log('    fakeApi("상품API", 80),          // 성공');
  console.log("  ])\n");

  try {
    const results = await Promise.all([
      fakeApi("유저API", 50),
      fakeApi("주문API", 30, true),  // 실패
      fakeApi("상품API", 80),
    ]);
    console.log("결과:", results);
  } catch (err) {
    console.log(`결과: catch로 빠짐 → ${err.message}`);
  }

  console.log("\n해설:");
  console.log("  - Promise.all은 하나라도 reject되면 즉시 전체가 reject");
  console.log("  - 유저API(성공), 상품API(성공)의 결과를 받을 수 없다!");
  console.log("  - 모든 요청이 반드시 성공해야 할 때만 사용");
  console.log("  - 예: DB 트랜잭션처럼 전부 성공 or 전부 실패가 필요한 경우\n");
}

// ============================================
// Quiz 2: Promise.allSettled — 실패해도 결과 수집
// ============================================
async function quiz2_promiseAllSettled() {
  console.log("=== Quiz 2: Promise.allSettled ===\n");
  console.log("예측해보세요: 3개 중 1개가 실패하면 어떻게 되는가?\n");

  const results = await Promise.allSettled([
    fakeApi("유저API", 50),
    fakeApi("주문API", 30, true),  // 실패
    fakeApi("상품API", 80),
  ]);

  console.log("결과:");
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      console.log(`  [${i}] 성공: ${result.value}`);
    } else {
      console.log(`  [${i}] 실패: ${result.reason.message}`);
    }
  });

  console.log("\n해설:");
  console.log("  - Promise.allSettled은 모든 Promise가 settled될 때까지 대기");
  console.log("  - 실패해도 다른 결과를 잃지 않는다");
  console.log("  - 각 결과에 { status: 'fulfilled', value } 또는 { status: 'rejected', reason }");
  console.log("  - 예: 대시보드에서 여러 위젯 데이터를 동시 로딩할 때");
  console.log("        → 하나 실패해도 나머지는 정상 표시\n");
}

// ============================================
// Quiz 3: Promise.race — 가장 빠른 것
// ============================================
async function quiz3_promiseRace() {
  console.log("=== Quiz 3: Promise.race ===\n");
  console.log("예측해보세요: 가장 빠른 것이 실패하면?\n");

  console.log("시나리오 A: 가장 빠른 것이 성공");
  try {
    const result = await Promise.race([
      fakeApi("느린API", 100),
      fakeApi("빠른API", 20),        // 가장 빠름 (성공)
      fakeApi("중간API", 50, true),  // 실패하지만 느림
    ]);
    console.log(`  결과: ${result}\n`);
  } catch (err) {
    console.log(`  결과: ${err.message}\n`);
  }

  console.log("시나리오 B: 가장 빠른 것이 실패");
  try {
    const result = await Promise.race([
      fakeApi("느린API", 100),
      fakeApi("빠른API", 20, true),  // 가장 빠름 (실패!)
      fakeApi("중간API", 50),
    ]);
    console.log(`  결과: ${result}\n`);
  } catch (err) {
    console.log(`  결과: catch → ${err.message}\n`);
  }

  console.log("해설:");
  console.log("  - Promise.race는 가장 먼저 settled된 결과를 반환");
  console.log("  - 성공이든 실패든 가장 빠른 것의 결과");
  console.log("  - 예: 타임아웃 구현");
  console.log("    Promise.race([fetch(url), timeout(3000)])");
  console.log("    → 3초 안에 응답 없으면 타임아웃\n");
}

// ============================================
// Quiz 4: Promise.any — 첫 성공을 기다림
// ============================================
async function quiz4_promiseAny() {
  console.log("=== Quiz 4: Promise.any ===\n");
  console.log("예측해보세요: 첫 번째가 실패하고, 두 번째가 성공하면?\n");

  console.log("시나리오 A: 일부 실패, 일부 성공");
  try {
    const result = await Promise.any([
      fakeApi("서버A", 20, true),   // 실패 (빠름)
      fakeApi("서버B", 50),          // 성공 (중간)
      fakeApi("서버C", 30, true),   // 실패 (빠름)
    ]);
    console.log(`  결과: ${result}\n`);
  } catch (err) {
    console.log(`  결과: ${err.message}\n`);
  }

  console.log("시나리오 B: 전부 실패");
  try {
    const result = await Promise.any([
      fakeApi("서버A", 20, true),
      fakeApi("서버B", 50, true),
      fakeApi("서버C", 30, true),
    ]);
    console.log(`  결과: ${result}\n`);
  } catch (err) {
    console.log(`  결과: AggregateError — ${err.message}`);
    console.log(`  개별 에러: ${err.errors.map((e) => e.message).join(", ")}\n`);
  }

  console.log("해설:");
  console.log("  - Promise.any는 첫 번째 fulfilled된 결과를 반환");
  console.log("  - 실패는 무시하고, 하나라도 성공하면 OK");
  console.log("  - 전부 실패하면 AggregateError (모든 에러 포함)");
  console.log("  - 예: 여러 CDN/미러 서버에서 가장 빠르게 응답하는 곳 사용\n");
}

// ============================================
// 실전: "3개 API를 동시에 호출할 때 어떤 패턴을 써야 하는가?"
// ============================================
async function practicalExample() {
  console.log("=== 실전: 3개 API를 동시에 호출할 때 ===\n");

  console.log("상황: 상품 상세 페이지에서 3개 API를 동시 호출");
  console.log("  - 상품 정보 API (필수)");
  console.log("  - 리뷰 목록 API (있으면 좋지만 없어도 됨)");
  console.log("  - 추천 상품 API (있으면 좋지만 없어도 됨)\n");

  // 잘못된 방법: Promise.all (하나 실패하면 전부 날아감)
  console.log("[잘못된 방법] Promise.all 사용:");
  try {
    await Promise.all([
      fakeApi("상품정보", 30),
      fakeApi("리뷰목록", 50, true),  // 리뷰 서버 장애!
      fakeApi("추천상품", 40),
    ]);
    console.log("  페이지 렌더링 성공");
  } catch (err) {
    console.log(`  전체 실패 → ${err.message}`);
    console.log("  → 리뷰 서버 장애 때문에 상품 페이지 자체를 못 보여줌!\n");
  }

  // 올바른 방법: Promise.allSettled (실패한 것만 빈 값 처리)
  console.log("[올바른 방법] Promise.allSettled 사용:");
  const results = await Promise.allSettled([
    fakeApi("상품정보", 30),
    fakeApi("리뷰목록", 50, true),  // 리뷰 서버 장애!
    fakeApi("추천상품", 40),
  ]);

  const productInfo = results[0].status === "fulfilled" ? results[0].value : null;
  const reviews = results[1].status === "fulfilled" ? results[1].value : null;
  const recommendations = results[2].status === "fulfilled" ? results[2].value : null;

  console.log(`  상품정보: ${productInfo || "로딩 실패"}`);
  console.log(`  리뷰목록: ${reviews || "(리뷰를 불러올 수 없습니다)"}`);
  console.log(`  추천상품: ${recommendations || "로딩 실패"}`);
  console.log("  → 리뷰만 빠지고, 나머지는 정상 표시!\n");

  // 필수 데이터 검증
  if (!productInfo) {
    console.log("  → 상품정보가 필수인데 실패 → 에러 페이지 표시");
  }
}

// ============================================
// 실행
// ============================================
async function main() {
  console.log("=== Promise 패턴 비교 데모 ===\n");

  await quiz1_promiseAll();
  await quiz2_promiseAllSettled();
  await quiz3_promiseRace();
  await quiz4_promiseAny();
  await practicalExample();

  console.log("=== 한눈에 비교 ===\n");
  console.log("┌─────────────────┬──────────────────────┬──────────────────────────┐");
  console.log("│ 패턴            │ 동작                 │ 사용 시점                │");
  console.log("├─────────────────┼──────────────────────┼──────────────────────────┤");
  console.log("│ Promise.all     │ 전부 성공 or 즉시 실패│ 모두 필수일 때           │");
  console.log("│ allSettled      │ 전부 기다림, 개별 결과│ 부분 실패 허용할 때      │");
  console.log("│ Promise.race    │ 가장 빠른 것 (성공/실패)│ 타임아웃 구현          │");
  console.log("│ Promise.any     │ 첫 성공 (실패 무시)  │ 여러 소스 중 하나만 필요 │");
  console.log("└─────────────────┴──────────────────────┴──────────────────────────┘");
}

main();
