# 04. 보안

## 이 폴더에서 배우는 것

- SQL Injection, XSS, CSRF 공격의 원리와 방어
- 입력 검증 (서버 측 필수)
- 비밀번호 안전하게 저장하기 (bcrypt)
- AI가 생성하는 코드의 보안 취약점 패턴

## 실습

```bash
cd examples
node sql-injection-demo.js   # SQL Injection 공격과 방어
node xss-demo.js             # XSS 공격 원리
node password-hashing.js     # 비밀번호 해싱 비교
```

## 핵심 질문

1. Parameterized Query가 SQL Injection을 막는 원리는?
2. React가 XSS를 기본적으로 방어하는 방법은?
3. MD5로 비밀번호를 해싱하면 안 되는 이유는?
4. AI가 만든 코드에서 보안 취약점을 찾는 체크리스트를 암기하고 있는가?

## 관련 챕터

- [02-database](../02-database/) — Parameterized Query가 동작하는 DB 계층의 원리
- [01-network](../01-network/) — JWT 인증과 CORS 보안 설정
- [03-system-design](../03-system-design/) — Rate Limiting으로 브루트포스 방어
