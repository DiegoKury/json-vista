import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'JsonVista',
      fileName: (format) => format === 'umd' ? 'json-vista.umd.cjs' : 'json-vista.es.js',
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
