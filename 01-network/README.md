# 01. 네트워크와 HTTP

## 이 폴더에서 배우는 것

- HTTP 요청/응답의 실체
- REST API 설계 원칙
- 인증 방식 (세션 vs JWT vs OAuth)
- CORS가 왜 생기고 어떻게 해결하는지

## 실습

### 1. HTTP 직접 관찰하기

브라우저 개발자도구(F12) → Network 탭 → 아무 사이트 접속
- Request Headers / Response Headers 확인
- Status Code 확인
- Timing 탭에서 각 단계별 소요시간 확인

### 2. curl로 API 호출하기

```bash
# GET 요청
curl -v https://jsonplaceholder.typicode.com/posts/1

# POST 요청
curl -X POST https://jsonplaceholder.typicode.com/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "test", "body": "hello", "userId": 1}'

# -v 옵션으로 헤더를 직접 확인하라
```

### 3. 예제 코드 실행

```bash
cd examples
node rest-api-server.js    # REST API 서버 띄우기
# 다른 터미널에서
node jwt-auth-example.js   # JWT 인증 흐름 확인
```

## 핵심 질문 (스스로 답해보기)

1. GET과 POST의 차이를 "멱등성" 관점에서 설명할 수 있는가?
2. 401과 403의 차이는?
3. JWT를 localStorage에 저장하면 안 되는 이유는?
4. CORS는 누가, 왜 차단하는 것인가?

## 관련 챕터

- [04-security](../04-security/) — JWT 보안 주의사항, XSS와 쿠키 보호
- [03-system-design](../03-system-design/) — API 설계와 Rate Limiting
