import { expect, test } from 'vitest';

import { createHistory } from './history';

test('measures spectrum history ingestion', () => {
  const history = createHistory(192, 96, [20, 20000], 'log');
  const frame = {
    values: new Float32Array(1024).fill(-35),
    frequencyRange: [0, 24000] as const,
  };
  for (let i = 0; i < 10000; i++) history.push(frame);
  const start = performance.now();
  for (let i = 0; i < 100000; i++) history.push(frame);
  console.info(
    `100,000 frame ingests: ${(performance.now() - start).toFixed(2)} ms`,
  );
});

test('log mapping samples equal frequency ratios and owns a bounded copy of reused frames', () => {
  const history = createHistory(2, 3, [100, 400], 'log');
  const values = Float32Array.from([1, 2, 3, 4]);
  const frame = { values, frequencyRange: [100, 400] as const };
  history.push(frame);
  values.fill(6);
  expect([...history.values.slice(0, 3)]).toEqual([1, 2, 4]);
  history.markDrawn();
  history.push(frame);
  values.fill(9);
  history.push(frame);
  expect(history.size).toBe(2);
  expect(history.pending).toBe(2);
  expect(history.next).toBe(1);
  expect([...history.values]).toEqual([9, 9, 9, 6, 6, 6]);
});
