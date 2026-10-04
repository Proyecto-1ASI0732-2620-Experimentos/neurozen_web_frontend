// Configuración de Vitest para las pruebas del frontend
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Zona horaria fija (Lima) para que las pruebas de fechas den igual en cualquier PC
process.env.TZ = 'America/Lima'

export default defineConfig({
  plugins: [
    // Permite probar componentes .vue.
    // includeAbsolute: false deja las imágenes de public/ (ej. /neurozen1_logo.png)
    // como texto; sin esto las pruebas fallan en Windows.
    vue({ template: { transformAssetUrls: { includeAbsolute: false } } })
  ],
  define: {
    // Constante que usa la app para mostrar la versión
    __APP_VERSION__: JSON.stringify('test')
  },
  test: {
    environment: 'jsdom', // simula el navegador (document, localStorage...)
    globals: true, // permite usar describe, it y expect sin importarlos
    setupFiles: ['./tests/setup.js'], // se ejecuta antes de cada archivo de pruebas
    include: ['tests/**/*.spec.js'], // archivos que se consideran pruebas
    restoreMocks: true, // limpia los mocks después de cada prueba
    coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/**/*.{js,vue}'] }
  }
})
