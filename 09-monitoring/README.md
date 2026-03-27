# 09. Monitoring & Observability

## 이 폴더에서 배우는 것

- 구조화된 로깅과 로그 레벨의 의미
- 헬스체크 엔드포인트 설계 (Kubernetes liveness/readiness)
- 메트릭 수집 (요청 수, 레이턴시, 에러율)
- 에러 추적과 분류 (일시적 vs 영구적)
- console.log가 프로덕션에서 왜 부족한지

## 실습

```bash
cd examples
node logging-levels.js    # 구조화된 로깅과 로그 레벨
node health-check.js      # 헬스체크 서버 (/health, /ready, /metrics)
node error-tracking.js    # 에러 분류와 집계
```

## 핵심 질문

1. DEBUG, INFO, WARN, ERROR, FATAL 로그 레벨의 차이를 설명할 수 있는가?
2. console.log 대신 구조화된 로깅을 써야 하는 이유는?
3. Kubernetes의 liveness probe와 readiness probe의 차이는?
4. 에러율이 급등했을 때, 일시적 에러와 영구적 에러를 어떻게 구분하는가?
5. 요청 ID(correlation ID)가 왜 분산 시스템에서 필수인가?

## 예제 목록

| 파일 | 내용 |
|------|------|
| `logging-levels.js` | 구조화된 로깅, 로그 레벨, 컨텍스트 전파 |
| `health-check.js` | HTTP 헬스체크 서버, 메트릭 수집 |
| `error-tracking.js` | 에러 분류, 에러율 알림, 서킷 브레이커 모니터링 |

## 관련 챕터

- [03-system-design](../03-system-design/) — Circuit Breaker 패턴과 Rate Limiting
- [08-error-handling](../08-error-handling/) — 에러 핸들링 패턴과 재시도 전략
- [06-infra](../06-infra/) — Dockerfile, Kubernetes 배포 환경
