import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        contentScript: resolve(__dirname, 'contentScript.jsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // format: 'iife', // Uncomment if you need IIFE for Chrome compatibility
      },
    },
    sourcemap: false,
    emptyOutDir: true,
  },
}); 