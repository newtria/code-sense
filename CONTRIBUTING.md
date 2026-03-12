# Contributing

기여를 환영합니다! 버그 수정, 새로운 예제, 설명 개선 등 어떤 형태든 좋습니다.

## 기여 방법

1. 이 저장소를 Fork
2. 브랜치 생성: `git checkout -b feature/새-예제`
3. 변경사항 커밋
4. Push: `git push origin feature/새-예제`
5. Pull Request 생성

## 규칙

### 외부 의존성 금지

모든 예제는 **Node.js 내장 모듈만** 사용한다. `npm install`이 필요한 예제는 받지 않는다.

```bash
# OK
const crypto = require("crypto");
const http = require("http");

# NOT OK
const express = require("express");
const bcrypt = require("bcrypt");
```

### 예제 실행 가능 필수

모든 예제는 `node <파일명>`으로 실행하면 결과가 출력되고 정상 종료되어야 한다.

```bash
# 새 예제 추가 후 반드시 확인
node 새-폴더/examples/새-예제.js
npm test  # 기존 예제가 깨지지 않는지 확인
```

### 서버 예제 예외

`rest-api-server.js`처럼 listen 후 종료하지 않는 서버 예제는 `scripts/run-all.js`의 CI 목록에 포함하지 않는다. 대신 주석으로 제외 사유를 남긴다.

### 파일 구조

```
XX-주제/
  README.md          # 학습 목표, 핵심 질문, 예제 목록
  examples/
    예제-이름.js      # 실행 가능한 예제
```

### 코딩 스타일

- 주석과 출력은 한국어
- 변수명과 함수명은 영어
- 매직넘버에는 반드시 주석으로 이유를 남긴다
- 보안 취약 코드를 데모할 때는 "데모용" 또는 "실무에서는 ~하라" 경고를 포함한다

### 커밋 메시지

```
feat: Rate Limiter 예제에 Sliding Window 추가
fix: jwt-auth-example의 서명 비교를 timingSafeEqual로 변경
docs: 03-system-design README 보강
```

## 새 주제 추가하기

현재 없는 주제(예: 디자인 패턴, 자료구조, 알고리즘)를 추가하려면:

1. `XX-주제/` 디렉토리 생성
2. `README.md` 작성 (학습 목표, 핵심 질문)
3. `examples/` 에 실행 가능 예제 추가
4. `package.json`의 scripts에 실행 명령 추가
5. `scripts/run-all.js`의 examples 배열에 추가
6. `cs-fundamentals.md`에 해당 챕터 추가

## 질문이나 제안

Issue를 열어주세요. 한국어/영어 모두 환영합니다.
