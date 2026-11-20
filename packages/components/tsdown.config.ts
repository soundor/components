import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    headless: 'src/headless.ts',
    theme: 'src/theme/index.tsx',
    chart: 'src/chart/index.ts',
  },
  platform: 'neutral',
  target: 'es2023',
  format: 'esm',
  sourcemap: true,
  dts: { sourcemap: true },
  tsconfig: './tsconfig.json',
  deps: {
    neverBundle: [/^soundor:/, /^@soundor\/react/, /^react(?:\/|$)/, /\.ttf$/],
  },
});
