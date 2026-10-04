import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    publicDir: 'public',
    server: { port: 5173 },
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0')
    },
    // En producción se eliminan los console.log/info/debug (los errores se conservan)
    esbuild: mode === 'production' ? { pure: ['console.log', 'console.info', 'console.debug'] } : {},
    build: {
      rollupOptions: {
        output: {
          manualChunks: { vendor: ['vue', 'vue-router', 'vue-i18n'] }
        }
      }
    }
  }
})
