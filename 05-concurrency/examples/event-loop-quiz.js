/**
 * Event Loop 동작 순서 퀴즈
 * 실행: node event-loop-quiz.js
 *
 * 각 퀴즈의 출력 순서를 예측한 후, 실제 결과와 비교하라.
 */

async function quiz1() {
  console.log("=== Quiz 1: 기본 ===");
  console.log("예상 순서를 먼저 생각해보세요...\n");

  console.log("1");

  setTimeout(() => console.log("2"), 0);

  Promise.resolve().then(() => console.log("3"));

  console.log("4");

  // 정답과 해설은 실행하면 나옴
  await new Promise((r) => setTimeout(r, 100));
  console.log("\n해설:");
  console.log("  1 → 동기 코드, 즉시 실행");
  console.log("  4 → 동기 코드, 즉시 실행");
  console.log("  3 → 마이크로태스크 (Promise), 동기 코드 직후 실행");
  console.log("  2 → 매크로태스크 (setTimeout), 마이크로태스크 후 실행");
  console.log("  정답: 1, 4, 3, 2\n");
}

async function quiz2() {
  console.log("=== Quiz 2: 심화 ===\n");

  console.log("A");

  setTimeout(() => {
    console.log("B");
    Promise.resolve().then(() => console.log("C"));
  }, 0);

  Promise.resolve().then(() => {
    console.log("D");
    setTimeout(() => console.log("E"), 0);
  });

  console.log("F");

  await new Promise((r) => setTimeout(r, 200));
  console.log("\n해설:");
  console.log("  A → 동기");
  console.log("  F → 동기");
  console.log("  D → 마이크로태스크 (첫 번째 Promise.then)");
  console.log("  B → 매크로태스크 (첫 번째 setTimeout)");
  console.log("  C → B 실행 중 등록된 마이크로태스크");
  console.log("  E → D 실행 중 등록된 매크로태스크 (가장 마지막)");
  console.log("  정답: A, F, D, B, C, E\n");
}

async function quiz3() {
  console.log("=== Quiz 3: async/await ===\n");

  async function foo() {
    console.log("G");
    await Promise.resolve();
    console.log("H"); // await 이후는 마이크로태스크로 처리
  }

  console.log("I");
  foo();
  console.log("J");

  await new Promise((r) => setTimeout(r, 100));
  console.log("\n해설:");
  console.log("  I → 동기");
  console.log("  G → foo() 호출, await 전까지는 동기 실행");
  console.log("  J → await에서 foo가 일시 정지, 호출자로 제어 반환");
  console.log("  H → 마이크로태스크 (await 이후)");
  console.log("  정답: I, G, J, H\n");
}

async function quiz4() {
  console.log("=== Quiz 4: process.nextTick ===\n");

  setTimeout(() => console.log("K"), 0);
  Promise.resolve().then(() => console.log("L"));
  process.nextTick(() => console.log("M"));
  console.log("N");

  await new Promise((r) => setTimeout(r, 100));
  console.log("\n해설:");
  console.log("  N → 동기");
  console.log("  M → nextTick (마이크로태스크보다 먼저 실행)");
  console.log("  L → 마이크로태스크 (Promise.then)");
  console.log("  K → 매크로태스크 (setTimeout)");
  console.log("  정답: N, M, L, K");
  console.log("  → process.nextTick > Promise.then > setTimeout 순서\n");
}

async function parallelDemo() {
  console.log("=== 보너스: 순차 vs 병렬 실행 ===\n");

  function delay(ms, label) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`  ${label} 완료 (${ms}ms)`);
        resolve(label);
      }, ms);
    });
  }

  // 순차 실행
  console.log("순차 실행:");
  console.time("  순차 총 시간");
  await delay(100, "작업A");
  await delay(100, "작업B");
  await delay(100, "작업C");
  console.timeEnd("  순차 총 시간");
  console.log();

  // 병렬 실행
  console.log("병렬 실행 (Promise.all):");
  console.time("  병렬 총 시간");
  await Promise.all([
    delay(100, "작업A"),
    delay(100, "작업B"),
    delay(100, "작업C"),
  ]);
  console.timeEnd("  병렬 총 시간");
  console.log();

  console.log("→ 서로 의존성이 없는 작업은 Promise.all로 병렬 실행하라");
  console.log("→ AI가 순차 await를 쓰고 있다면 병렬화 가능한지 확인하라");
}

async function main() {
  await quiz1();
  await quiz2();
  await quiz3();
  await quiz4();
  await parallelDemo();
}

main();
