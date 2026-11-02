// 단위 테스트 전용 설정(e2e/는 Playwright가 실행). 앱 빌드 설정(vite.config.ts)과 분리해 타입 충돌을 피한다.
export default { test: { include: ["src/**/*.test.ts"] } };
