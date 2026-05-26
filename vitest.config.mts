import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const aliases = {
  '@/': path.resolve(dirname, './src') + '/',
  '@process/': path.resolve(dirname, './src/process') + '/',
  '@renderer/': path.resolve(dirname, './src/renderer') + '/',
  '@worker/': path.resolve(dirname, './src/process/worker') + '/',
  '@mcp/models/': path.resolve(dirname, './src/common/models') + '/',
  '@mcp/types/': path.resolve(dirname, './src/common') + '/',
  '@mcp/': path.resolve(dirname, './src/common') + '/',
};

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  test: {
    globals: true,
    testTimeout: 10000,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/unit/**/test_*.ts',
            'tests/contract/**/*.test.ts',
            'tests/integration/**/*.test.ts',
            'tests/regression/**/*.test.ts',
          ],
          exclude: ['tests/unit/**/*.dom.test.ts', 'tests/unit/**/*.dom.test.tsx'],
          setupFiles: ['./tests/vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: [
            'tests/unit/**/*.dom.test.ts',
            'tests/unit/**/*.dom.test.tsx',
            'tests/contract/**/*.dom.test.ts',
            'tests/contract/**/*.dom.test.tsx',
          ],
          setupFiles: ['./tests/vitest.dom.setup.ts'],
        },
      },
    ],
    benchmark: {
      include: ['tests/bench/**/*.bench.ts'],
      outputFile: './bench-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}', 'scripts/prepareBundledBun.js'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/preload.ts',
        'src/common/utils/shims/**',
        'src/common/types/**',
        'src/renderer/**/*.json',
        'src/renderer/**/*.svg',
        'src/renderer/**/*.css',
        'src/common/config/i18n-config.json',
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});
