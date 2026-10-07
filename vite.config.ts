/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@config': path.resolve(__dirname, './src/config'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
      '@img': path.resolve(__dirname, './src/img'),
      '@interfaces': path.resolve(__dirname, './src/interfaces'),
      '@models': path.resolve(__dirname, './src/models'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@services': path.resolve(__dirname, './src/services'),
      '@themes': path.resolve(__dirname, './src/themes'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 7053,
    proxy: {
      '^/api/v1/(revenues|spendings|revenue-types|spending-types|budget-rules)': {
        target: process.env.VITE_BUDGET_API_URL || 'http://localhost:7052',
        changeOrigin: true,
      },
      '^/api/v1/(sessions|live|tuning)': {
        target: process.env.VITE_FORZA_API_URL || 'http://localhost:7057',
        changeOrigin: true,
      },
      '^/api/v1/(motorcycles|oil-intervals)': {
        target: process.env.VITE_MOTO_API_URL || 'http://localhost:7059',
        changeOrigin: true,
      },
      '^/api/v1/backups': {
        target: process.env.VITE_BACKUP_API_URL || 'http://localhost:7058',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:7051',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
    css: false,
    // `npm run test:coverage`: o lcov alimenta o Sonar (sonar.javascript.lcov.reportPaths); sem ele a cobertura do
    // código novo é 0% e o Quality Gate reprova.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/main.tsx', 'src/vite-env.d.ts', 'src/interfaces/**'],
    },
  },
});
