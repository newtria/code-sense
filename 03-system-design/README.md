# 03. 시스템 설계

## 이 폴더에서 배우는 것

- 모놀리스 vs MSA — 언제 무엇을 선택하는가
- 수직/수평 확장과 로드밸런싱
- 캐시 전략 (Cache-Aside, TTL, 무효화)
- 메시지 큐와 비동기 처리
- Rate Limiting, Circuit Breaker

## 실습

```bash
cd examples
node cache-aside.js       # Cache-Aside 패턴 구현
node rate-limiter.js      # Rate Limiting 직접 구현
```

## 핵심 질문

1. "우리 서비스에 MSA를 도입하자"는 제안이 왔을 때 어떤 반론을 할 수 있는가?
2. 캐시를 추가할 때 반드시 함께 고려해야 하는 것은?
3. 회원가입 시 이메일 발송을 API 핸들러에서 동기로 처리하면 무슨 문제가 생기는가?
4. Rate Limiting을 안 하면 어떤 공격에 취약한가?

## 관련 챕터

- [04-security](../04-security/) — Rate Limiting과 브루트포스 방어의 연결
- [02-database](../02-database/) — 캐시 전략과 DB 쿼리 최적화의 관계
- [05-concurrency](../05-concurrency/) — 메시지 큐의 비동기 처리와 동시성 제어
