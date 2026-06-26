import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

/**
 * Main/preload must not bundle heavy CJS/ESM trees (pdf-parse, mammoth, electron-store).
 * Inlining them produces Rollup interop like `require2` and "Cannot access before initialization" at runtime.
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['playwright', 'playwright-core'],
        output: {
          format: 'es'
        }
      }
    }
  },
  // Preload must be CommonJS: Electron loads it as a classic script; ESM (.mjs) throws
  // "Cannot use import statement outside a module".
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
