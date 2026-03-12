# CS Fundamentals for Vibe Coders

AI가 코드를 짜주는 시대, **"뭘 만들어달라고 해야 하는지"** 아는 사람이 되기 위한 CS 기초 가이드.

> "바이브코딩은 뭘 아는 사람한테 날개고, 모르는 사람한테 지뢰밭이다."

## 왜 이걸 공부해야 하는가

AI에게 "게시판 만들어줘"라고 하면 게시판이 나온다. 근데:

- 동시에 100명이 글을 쓰면? → **동시성** 모르면 데이터가 꼬인다
- 게시글이 100만 개가 되면? → **인덱스** 모르면 3초씩 걸린다
- 누군가 `<script>alert('해킹')</script>`을 제목에 넣으면? → **보안** 모르면 털린다
- 배포하려면? → **인프라** 모르면 로컬에서만 돌아간다

AI는 부분을 잘 만든다. 전체를 설계하고 판단하는 건 아직 사람 몫이다.

## 빠르게 시작하기

```bash
# 요구사항: Node.js 22+
git clone https://github.com/<your-username>/cs-fundamentals.git
cd cs-fundamentals
```

예제를 골라서 실행하면 된다:

```bash
node 04-security/examples/sql-injection-demo.js   # SQL Injection 공격/방어
node 05-concurrency/examples/race-condition-demo.js # Race Condition 체험
node 01-network/examples/jwt-auth-example.js        # JWT 생성/검증/변조
```

또는 npm 스크립트로:

```bash
npm run 04:sql-injection
npm run 05:race
npm run 01:jwt
```

## 실행 결과 미리보기

```
=== SQL Injection 데모 ===

공격: 비밀번호 우회
  실행되는 쿼리: SELECT * FROM users WHERE username = 'admin' --' AND password = '아무거나'
  결과: 성공! admin으로 로그인됨 (비밀번호 없이)

같은 공격 시도 (Parameterized Query):
  결과: 실패 — 공격이 무력화됨
  → "admin' --"가 문자열 값 그대로 검색됨 (SQL로 해석되지 않음)
```

## 로드맵

| # | 주제 | 난이도 | 핵심 질문 | 예제 |
|---|------|--------|---------|------|
| 0 | [Git](./00-git/) | 기초 | 커밋, 브랜치, 되돌리기를 자유롭게 할 수 있는가? | `git-playground.sh` |
| 1 | [네트워크/HTTP](./01-network/) | 기초 | API 설계할 때 뭘 요구해야 하는가? | `rest-api-server.js` `jwt-auth-example.js` |
| 2 | [데이터베이스](./02-database/) | 기초~중급 | AI가 만든 쿼리가 왜 느린지 판단할 수 있는가? | `database-basics.js` `n-plus-one.js` |
| 3 | [시스템 설계](./03-system-design/) | 중급 | 서비스 전체 그림을 그릴 수 있는가? | `cache-aside.js` `rate-limiter.js` |
| 4 | [보안](./04-security/) | 기초~중급 | AI가 만든 코드의 보안 구멍을 찾을 수 있는가? | `sql-injection-demo.js` `xss-demo.js` `password-hashing.js` |
| 5 | [동시성/비동기](./05-concurrency/) | 중급~심화 | 왜 가끔 결제가 두 번 되는지 설명할 수 있는가? | `event-loop-quiz.js` `race-condition-demo.js` |
| 6 | [인프라](./06-infra/) | 중급 | 만든 걸 세상에 내보낼 수 있는가? | `Dockerfile` `docker-compose.yml` `ci.yml` |
| 7 | [테스트](./07-testing/) | 기초~중급 | AI가 만든 코드를 테스트로 검증할 수 있는가? | `test-runner.js` |
| 8 | [에러 핸들링](./08-error-handling/) | 기초~중급 | 에러를 삼키지 않고 올바르게 처리하고 있는가? | `error-handling-demo.js` |

## 전체 가이드

**[cs-fundamentals.md](./cs-fundamentals.md)** 에 9개 챕터의 전체 내용이 하나의 문서로 정리되어 있다.

각 챕터마다 "AI가 자주 틀리는 것" 체크리스트가 있고, 부록에는 바이브코딩 실전 리뷰 체크리스트가 포함되어 있다.

## 프로젝트 구조

```
.
├── cs-fundamentals.md          # 전체 가이드 (이론 + 코드 예제)
├── 00-git/examples/            # Git 실습 스크립트
├── 01-network/examples/        # REST API, JWT
├── 02-database/examples/       # SQL, 인덱스, N+1 문제
├── 03-system-design/examples/  # 캐시, Rate Limiter
├── 04-security/examples/       # SQL Injection, XSS, 비밀번호 해싱
├── 05-concurrency/examples/    # Event Loop, Race Condition
├── 06-infra/examples/          # Dockerfile, docker-compose, CI/CD
├── 07-testing/examples/        # 미니 테스트 프레임워크
└── 08-error-handling/examples/ # 에러 핸들링 패턴
```

## 설계 원칙

- **외부 의존성 제로** — `npm install` 없이 Node.js만으로 모든 예제 실행 가능
- **실행 가능한 코드** — 이론만이 아니라 직접 돌려보고 결과를 확인
- **바이브코딩 관점** — "직접 구현"이 아니라 "AI가 만든 코드를 판단"하는 능력 중심

## 학습 방법

1. `cs-fundamentals.md` 상단의 **진도 체크리스트**를 기준으로 학습
2. 각 폴더의 예제 코드를 직접 실행
3. "AI가 자주 틀리는 것" 체크리스트로 코드 리뷰 연습
4. 실제 바이브코딩을 하면서 해당 체크리스트를 적용

## 기여하기

버그 수정, 새로운 예제, 설명 개선 등 모든 기여를 환영합니다.

1. Fork 후 브랜치 생성 (`git checkout -b feature/새-예제`)
2. 변경사항 커밋
3. Pull Request 생성

**기여 시 주의사항:**
- 예제는 외부 의존성 없이 Node.js 내장 모듈만 사용
- 모든 예제는 `node <파일명>`으로 실행 가능해야 함
- `npm test`를 실행해서 기존 예제가 깨지지 않는지 확인

## 라이선스

[MIT](./LICENSE)
