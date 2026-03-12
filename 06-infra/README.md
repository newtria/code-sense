# 06. 인프라

## 이 폴더에서 배우는 것

- Docker로 앱 컨테이너화
- Docker Compose로 개발 환경 구성
- GitHub Actions CI/CD 파이프라인
- 배포 전략 (Rolling, Blue-Green, Canary)

## 실습

### 1. Docker 실행

```bash
cd examples
docker build -t cs-demo-app .
docker run -p 3000:3000 cs-demo-app
```

### 2. Docker Compose로 전체 스택

```bash
docker compose up -d
# App (3000) + PostgreSQL (5432) + Redis (6379) 한 번에 실행
docker compose logs -f
docker compose down
```

### 3. GitHub Actions

`.github/workflows/ci.yml` 파일을 자신의 레포에 복사하면 CI가 자동 실행된다.

## 핵심 질문

1. Docker 이미지와 컨테이너의 차이는?
2. Dockerfile에서 COPY 순서가 빌드 속도에 영향을 미치는 이유는?
3. Blue-Green 배포와 Canary 배포의 차이는?
4. 서버가 살아있는지 확인하는 헬스체크의 역할은?
