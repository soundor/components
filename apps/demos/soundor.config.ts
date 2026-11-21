import { defineSoundorConfig } from '@soundor/config';
import { vst3Runtime } from '@soundor/vst3-runtime';
import { webRuntime } from '@soundor/web-runtime';

// The plugin the docs' demos run in: a parameter or two for each kind of
// control, and a UI (src/main.tsx) that shows one demo at a time. The web
// build is what the documentation embeds; the VST3 build is for the
// end-to-end tests in the VST3 host (e2e/vst3), never shipped.
export default defineSoundorConfig({
  plugin: {
    id: 'dev.soundor.components.demos',
    name: 'Soundor Components demos',
  },
  runtimes: [webRuntime(), vst3Runtime()],
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
    filterType: {
      type: 'choice',
      label: 'Filter Type',
      options: [
        { value: 'lowpass', label: 'Low Pass' },
        { value: 'highpass', label: 'High Pass' },
        { value: 'bandpass', label: 'Band Pass' },
        { value: 'notch', label: 'Notch' },
        { value: 'peak', label: 'Peak' },
      ],
      default: 'lowpass',
    },
    // An amplitude envelope, its times in milliseconds on a log mapping.
    attack: {
      type: 'float32',
      label: 'Attack',
      min: 1,
      max: 5000,
      default: 20,
      unit: 'ms',
      mapping: 'log',
    },
    decay: {
      type: 'float32',
      label: 'Decay',
      min: 1,
      max: 5000,
      default: 300,
      unit: 'ms',
      mapping: 'log',
    },
    sustain: {
      type: 'float32',
      label: 'Sustain',
      min: 0,
      max: 1,
      default: 0.65,
    },
    release: {
      type: 'float32',
      label: 'Release',
      min: 1,
      max: 10000,
      default: 800,
      unit: 'ms',
      mapping: 'log',
    },
  },
});
