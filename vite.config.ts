import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// Fontsource CSS는 woff2 옆에 구형 woff 대체 형식도 함께 선언한다. 요즘 브라우저는 woff2만으로 충분해서,
// 배포 파일 수와 용량을 반으로 줄이려고 빌드할 때 woff 선언을 지운다.
function dropWoffFallback(): Plugin {
  return {
    name: 'drop-woff-fallback',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource') || !id.endsWith('.css')) return null
      return { code: code.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, ''), map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [dropWoffFallback(), react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
