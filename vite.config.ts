import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// PRD.md 44장 백엔드 프록시(api/kbo-schedule.ts)를 `vercel dev` 없이 `npm run dev`에서도
// 그대로 검증할 수 있도록, 같은 핸들러를 로컬 dev 서버 미들웨어로 연결한다.
// 배포 시에는 이 플러그인이 관여하지 않고 Vercel이 api/*.ts를 직접 서버리스 함수로 실행한다.
function kboScheduleDevMiddleware(): Plugin {
  return {
    name: 'kbo-schedule-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/kbo-schedule', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/kbo-schedule.ts')
        await handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), kboScheduleDevMiddleware()],
})
