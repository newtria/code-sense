# Node.js 앱 Dockerfile 예제
# 빌드: docker build -t cs-demo-app .
# 실행: docker run -p 3000:3000 cs-demo-app

# 1. 기반 이미지 — Alpine은 경량 Linux (~5MB)
FROM node:20-alpine

# 2. 작업 디렉토리
WORKDIR /app

# 3. 의존성 파일만 먼저 복사 (레이어 캐시 최적화)
#    package.json이 변하지 않으면 npm ci를 다시 실행하지 않음
COPY package.json package-lock.json* ./

# 4. 의존성 설치
#    npm ci = 정확히 lock 파일 기반 설치 (npm install보다 일관적)
#    --production = devDependencies 제외 (이미지 크기 감소)
RUN npm ci --production 2>/dev/null || echo "no dependencies"

# 5. 소스코드 복사 (자주 변하는 것을 마지막에)
COPY . .

# 6. 포트 문서화 (실제 바인딩은 docker run -p에서)
EXPOSE 3000

# 7. 헬스체크 — 컨테이너가 살아있는지 확인
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# 8. non-root 유저로 실행 (보안)
USER node

# 9. 컨테이너 시작 명령
CMD ["node", "server.js"]
