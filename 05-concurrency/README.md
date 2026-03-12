# 05. 동시성과 비동기

## 이 폴더에서 배우는 것

- JavaScript Event Loop의 동작 원리
- async/await, Promise.all, Promise.allSettled
- Race Condition의 실제 사례와 방어
- 데드락의 원리와 예방

## 실습

```bash
cd examples
node event-loop-quiz.js      # Event Loop 동작 순서 퀴즈
node race-condition-demo.js  # Race Condition 직접 체험
```

## 핵심 질문

1. `setTimeout(fn, 0)`이 즉시 실행되지 않는 이유는?
2. `Promise.all`과 `Promise.allSettled`의 차이는?
3. 쇼핑몰에서 재고 1개인 상품을 2명이 동시에 구매하면?
4. 데드락이 발생하는 4가지 조건은?

## 관련 챕터

- [02-database](../02-database/) — 트랜잭션 격리 수준과 동시성의 관계
- [03-system-design](../03-system-design/) — 메시지 큐를 통한 비동기 처리
