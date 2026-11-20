import { defineSoundorConfig } from '@soundor/config';
import { webRuntime } from '@soundor/web-runtime';

// The plugin the docs' demos run in: a parameter or two for each kind of
// control, and a UI (src/main.tsx) that shows one demo at a time. Only the
// web runtime: the demos live in the documentation.
export default defineSoundorConfig({
  plugin: {
    id: 'dev.soundor.components.demos',
    name: 'Soundor Components demos',
  },
  runtimes: [webRuntime()],
  parameters: {
    feedback: {
      type: 'float32',
      label: 'Feedback',
      min: 0,
      max: 1,
      default: 0.4,
    },
    mix: { type: 'float32', label: 'Mix', min: 0, max: 1, default: 0.5 },
    gain: {
      type: 'float32',
      label: 'Gain',
      min: -24,
      max: 6,
      default: 0,
      unit: 'dB',
    },
    time: {
      type: 'float32',
      label: 'Time',
      min: 1,
      max: 2000,
      default: 250,
      unit: 'ms',
    },
    bypass: { type: 'boolean', label: 'Bypass', default: false },
    mode: {
      type: 'choice',
      label: 'Mode',
      options: [
        { value: 'sync', label: 'Sync' },
        { value: 'free', label: 'Free' },
      ],
      default: 'sync',
    },
  },
});
