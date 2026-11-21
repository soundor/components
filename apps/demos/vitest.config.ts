import { soundor } from '@soundor/vitest-e2e';
import { defineConfig } from 'vitest/config';

// The plugin's Debug VST3 in the VST3 host, its editor open: the components
// with the engine's layout and input, bound to parameters a host records.
// `pnpm test:vst3` builds it first.
export default defineConfig({
  plugins: [
    soundor({ vst3: '.soundor/debug/vst3/Soundor Components demos.vst3' }),
  ],
  test: { include: ['e2e/vst3/**/*.test.ts'] },
});
