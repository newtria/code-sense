/**
 * 헬스체크 서버 & 메트릭 수집 데모
 * 실행: node health-check.js
 *
 * Kubernetes의 liveness/readiness probe 패턴과
 * 기본적인 메트릭 수집(요청 수, 레이턴시, 에러율)을 이해한다.
 * 외부 의존성 없이 Node.js 내장 http 모듈만 사용한다.
 *
 * 주의: 이 예제는 서버를 띄우지 않고, 시뮬레이션으로 동작을 보여준다.
 *       (run-all.js에서 자동 실행 시 정상 종료되도록)
 */

// ============================================
// 1. Liveness vs Readiness Probe
// ============================================
console.log("=== 1. Liveness vs Readiness Probe ===\n");

console.log("Kubernetes는 두 가지 방식으로 서비스 상태를 확인한다:\n");

console.log("  Liveness Probe (/health):");
console.log("  - 질문: '이 프로세스가 살아있는가?'");
console.log("  - 실패 시: 컨테이너를 재시작한다");
console.log("  - 예: 데드락, 무한루프 감지\n");

console.log("  Readiness Probe (/ready):");
console.log("  - 질문: '이 프로세스가 트래픽을 받을 준비가 되었는가?'");
console.log("  - 실패 시: 로드밸런서에서 제외 (재시작은 하지 않음)");
console.log("  - 예: DB 연결 대기 중, 캐시 워밍업 중\n");

console.log("  핵심 차이:");
console.log("  ┌──────────────┬────────────────────┬────────────────────┐");
console.log("  │              │ Liveness (/health) │ Readiness (/ready) │");
console.log("  ├──────────────┼────────────────────┼────────────────────┤");
console.log("  │ 확인 대상    │ 프로세스 생존 여부  │ 트래픽 처리 가능성  │");
console.log("  │ 실패 시 동작 │ 컨테이너 재시작     │ 트래픽 라우팅 제외  │");
console.log("  │ 체크 내용    │ 기본 응답 가능 여부  │ 의존성 연결 상태   │");
console.log("  │ 무거운 체크  │ X (가볍게)          │ O (DB, 캐시 등)   │");
console.log("  └──────────────┴────────────────────┴────────────────────┘\n");

// ============================================
// 2. 의존성 상태 관리
// ============================================
console.log("=== 2. 의존성 상태 시뮬레이션 ===\n");

// 의존성 상태를 관리하는 클래스
class DependencyChecker {
  constructor() {
    this.dependencies = new Map();
  }

  // 의존성 등록
  register(name, checkFn) {
    this.dependencies.set(name, { checkFn, status: "unknown", lastCheck: null });
  }

  // 모든 의존성 체크
  async checkAll() {
    const results = {};
    let allHealthy = true;

    for (const [name, dep] of this.dependencies) {
      try {
        await dep.checkFn();
        dep.status = "healthy";
        dep.lastCheck = new Date().toISOString();
        results[name] = { status: "healthy" };
      } catch (err) {
        dep.status = "unhealthy";
        dep.lastCheck = new Date().toISOString();
        results[name] = { status: "unhealthy", error: err.message };
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, dependencies: results };
  }
}

const checker = new DependencyChecker();

// 의존성 등록 (시뮬레이션)
let dbConnected = true;
let cacheConnected = true;
let queueConnected = true;

checker.register("database", async () => {
  if (!dbConnected) throw new Error("ECONNREFUSED");
});

checker.register("redis-cache", async () => {
  if (!cacheConnected) throw new Error("ETIMEDOUT");
});

checker.register("message-queue", async () => {
  if (!queueConnected) throw new Error("ENOTFOUND");
});

// 시나리오 1: 모든 의존성 정상
(async () => {
  console.log("시나리오 1 — 모든 의존성 정상:");
  let result = await checker.checkAll();
  console.log(`  /ready 응답: ${result.healthy ? "200 OK" : "503 Service Unavailable"}`);
  console.log(`  ${JSON.stringify(result, null, 2)}\n`);

  // 시나리오 2: DB 연결 끊김
  console.log("시나리오 2 — DB 연결 끊김:");
  dbConnected = false;
  result = await checker.checkAll();
  console.log(`  /ready 응답: ${result.healthy ? "200 OK" : "503 Service Unavailable"}`);
  console.log(`  ${JSON.stringify(result, null, 2)}\n`);

  console.log("  → DB가 끊기면 readiness가 실패한다");
  console.log("  → Kubernetes가 이 Pod를 로드밸런서에서 빼낸다");
  console.log("  → DB가 복구되면 자동으로 다시 트래픽을 받는다\n");

  // 복구
  dbConnected = true;

  // ============================================
  // 3. 메트릭 수집
  // ============================================
  console.log("=== 3. 메트릭 수집 ===\n");

  class MetricsCollector {
    constructor() {
      this.counters = new Map();     // 단순 카운터 (요청 수, 에러 수)
      this.histograms = new Map();   // 히스토그램 (레이턴시 분포)
      this.gauges = new Map();       // 게이지 (현재값: 메모리 사용량, 활성 연결 수)
    }

    // 카운터 증가
    incrementCounter(name, labels = {}) {
      const key = this._makeKey(name, labels);
      const current = this.counters.get(key) || 0;
      this.counters.set(key, current + 1);
    }

    // 히스토그램에 값 추가
    observeHistogram(name, value, labels = {}) {
      const key = this._makeKey(name, labels);
      if (!this.histograms.has(key)) {
        this.histograms.set(key, { values: [], sum: 0, count: 0 });
      }
      const hist = this.histograms.get(key);
      hist.values.push(value);
      hist.sum += value;
      hist.count++;
    }

    // 게이지 설정
    setGauge(name, value, labels = {}) {
      const key = this._makeKey(name, labels);
      this.gauges.set(key, value);
    }

    // 히스토그램 퍼센타일 계산
    getPercentile(name, percentile, labels = {}) {
      const key = this._makeKey(name, labels);
      const hist = this.histograms.get(key);
      if (!hist || hist.values.length === 0) return 0;

      const sorted = [...hist.values].sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    }

    // /metrics 엔드포인트용 출력 (Prometheus 텍스트 형식 간략 버전)
    formatMetrics() {
      const lines = [];

      // 카운터
      for (const [key, value] of this.counters) {
        lines.push(`${key} ${value}`);
      }

      // 히스토그램 요약
      for (const [key, hist] of this.histograms) {
        lines.push(`${key}_count ${hist.count}`);
        lines.push(`${key}_sum ${hist.sum.toFixed(2)}`);
        const sorted = [...hist.values].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
        lines.push(`${key}{quantile="0.5"} ${p50.toFixed(2)}`);
        lines.push(`${key}{quantile="0.95"} ${p95.toFixed(2)}`);
        lines.push(`${key}{quantile="0.99"} ${p99.toFixed(2)}`);
      }

      // 게이지
      for (const [key, value] of this.gauges) {
        lines.push(`${key} ${value}`);
      }

      return lines.join("\n");
    }

    _makeKey(name, labels) {
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      return labelStr ? `${name}{${labelStr}}` : name;
    }
  }

  const metrics = new MetricsCollector();

  // 요청 시뮬레이션: 다양한 엔드포인트에 요청을 보낸다
  console.log("100개의 요청을 시뮬레이션...\n");

  const endpoints = [
    { method: "GET", path: "/api/users", avgLatency: 50, errorRate: 0.02 },
    { method: "POST", path: "/api/orders", avgLatency: 200, errorRate: 0.05 },
    { method: "GET", path: "/api/products", avgLatency: 30, errorRate: 0.01 },
  ];

  for (let i = 0; i < 100; i++) {
    const ep = endpoints[i % endpoints.length];
    const isError = Math.random() < ep.errorRate;
    const statusCode = isError ? (Math.random() < 0.5 ? 500 : 503) : 200;
    // 레이턴시에 약간의 변동을 준다
    const latency = ep.avgLatency * (0.5 + Math.random());

    // 카운터: 요청 수
    metrics.incrementCounter("http_requests_total", {
      method: ep.method,
      path: ep.path,
      status: statusCode,
    });

    // 히스토그램: 레이턴시
    metrics.observeHistogram("http_request_duration_ms", latency, {
      method: ep.method,
      path: ep.path,
    });
  }

  // 게이지: 현재 상태
  const memUsage = process.memoryUsage();
  metrics.setGauge("nodejs_heap_used_bytes", memUsage.heapUsed);
  metrics.setGauge("nodejs_heap_total_bytes", memUsage.heapTotal);
  metrics.setGauge("nodejs_active_connections", 23);

  // /metrics 출력
  console.log("/metrics 엔드포인트 출력:\n");
  console.log(metrics.formatMetrics());
  console.log();

  // ============================================
  // 4. 핵심 메트릭 4가지 (RED + USE)
  // ============================================
  console.log("=== 4. 핵심 메트릭: RED 메서드 ===\n");

  console.log("서비스 모니터링의 핵심 3가지 (RED Method):\n");

  console.log("  R — Rate (요청률):    초당 요청 수 (RPS)");
  console.log("  E — Errors (에러율):  전체 요청 중 에러 비율");
  console.log("  D — Duration (지연):  요청 처리 시간 (p50, p95, p99)\n");

  // 수집된 메트릭으로 RED 계산
  let totalRequests = 0;
  let errorRequests = 0;

  for (const [key, value] of metrics.counters) {
    totalRequests += value;
    if (key.includes('status="5')) {
      errorRequests += value;
    }
  }

  console.log("  시뮬레이션 결과:");
  console.log(`  - Rate:     ${totalRequests}개 요청`);
  console.log(`  - Errors:   ${errorRequests}개 에러 (${((errorRequests / totalRequests) * 100).toFixed(1)}%)`);

  for (const ep of endpoints) {
    const p50 = metrics.getPercentile("http_request_duration_ms", 50, {
      method: ep.method,
      path: ep.path,
    });
    const p95 = metrics.getPercentile("http_request_duration_ms", 95, {
      method: ep.method,
      path: ep.path,
    });

    console.log(`  - Duration: ${ep.method} ${ep.path} — p50: ${p50.toFixed(0)}ms, p95: ${p95.toFixed(0)}ms`);
  }

  console.log();

  // ============================================
  // 5. 헬스체크 서버 구조 (코드 설명)
  // ============================================
  console.log("=== 5. 헬스체크 서버 구조 ===\n");

  console.log("실제 서버에서의 엔드포인트 구성:\n");

  console.log("  const http = require('http');");
  console.log("  const server = http.createServer((req, res) => {");
  console.log("    // Liveness: 프로세스가 살아있는지만 확인");
  console.log("    if (req.url === '/health') {");
  console.log("      res.writeHead(200);");
  console.log("      res.end(JSON.stringify({ status: 'ok' }));");
  console.log("    }");
  console.log("    // Readiness: DB, 캐시 등 의존성까지 확인");
  console.log("    else if (req.url === '/ready') {");
  console.log("      const result = await checker.checkAll();");
  console.log("      const status = result.healthy ? 200 : 503;");
  console.log("      res.writeHead(status);");
  console.log("      res.end(JSON.stringify(result));");
  console.log("    }");
  console.log("    // Metrics: Prometheus가 주기적으로 스크래핑");
  console.log("    else if (req.url === '/metrics') {");
  console.log("      res.writeHead(200, { 'Content-Type': 'text/plain' });");
  console.log("      res.end(metrics.formatMetrics());");
  console.log("    }");
  console.log("  });\n");

  console.log("  Kubernetes YAML 설정 예시:\n");

  console.log("  livenessProbe:");
  console.log("    httpGet:");
  console.log("      path: /health");
  console.log("      port: 3000");
  console.log("    initialDelaySeconds: 5    # 시작 후 5초 대기");
  console.log("    periodSeconds: 10          # 10초마다 체크");
  console.log("    failureThreshold: 3        # 3번 실패 시 재시작\n");

  console.log("  readinessProbe:");
  console.log("    httpGet:");
  console.log("      path: /ready");
  console.log("      port: 3000");
  console.log("    initialDelaySeconds: 3    # 시작 후 3초 대기");
  console.log("    periodSeconds: 5           # 5초마다 체크");
  console.log("    failureThreshold: 2        # 2번 실패 시 트래픽 차단\n");

  // ============================================
  // 핵심 정리
  // ============================================
  console.log("=== 핵심 정리 ===\n");
  console.log("1. /health (liveness) — 가볍게, 프로세스 생존만 확인");
  console.log("2. /ready (readiness) — 의존성(DB, 캐시) 연결 상태까지 확인");
  console.log("3. /metrics — Prometheus 형식으로 메트릭 노출");
  console.log("4. RED 메서드: Rate, Errors, Duration 세 가지를 항상 측정하라");
  console.log("5. 히스토그램의 p95, p99가 평균보다 훨씬 중요하다");
  console.log("   (평균 50ms인데 p99가 3초이면 1%의 유저가 3초를 기다린다)");
})();
