# 02. 데이터베이스

## 이 폴더에서 배우는 것

- 테이블 설계와 정규화
- SQL 핵심 (JOIN, 서브쿼리, 집계)
- 인덱스의 원리와 적용 기준
- 트랜잭션과 ACID
- ORM의 N+1 문제

## 실습

### 1. SQLite로 직접 실행하기

```bash
cd examples
node database-basics.js  # 테이블 생성, CRUD, JOIN, 인덱스 실습
```

### 2. 실행 계획 읽기

```sql
-- MySQL이나 PostgreSQL에서
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'hong@test.com';

-- type이 ALL이면 풀스캔 → 인덱스 필요
-- rows가 크면 비효율적 → 조건 개선 필요
```

### 3. N+1 문제 체감하기

```bash
node n-plus-one.js  # N+1이 얼마나 느린지 직접 비교
```

## 핵심 질문

1. 정규화를 왜 하고, 언제 안 하는가?
2. 인덱스를 걸면 무조건 빨라지는가? 단점은?
3. `LEFT JOIN`과 `INNER JOIN`의 차이를 설명할 수 있는가?
4. 트랜잭션 없이 계좌이체를 구현하면 무슨 일이 생기는가?

## 관련 챕터

- [04-security](../04-security/) — SQL Injection 방어에서 Parameterized Query를 학습
- [05-concurrency](../05-concurrency/) — 트랜잭션 격리 수준과 Race Condition의 관계
