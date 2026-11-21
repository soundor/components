import {
  fireEvent,
  render,
  screen,
  testEditor,
  userEvent,
} from '@soundor/testing-library/react';
import { expect, test } from 'vitest';

import { ResizeGrip } from '../../index';

test('the grip follows the original screen-space drag across resizes and restores the press size on cancel', async () => {
  testEditor.resize({ width: 800, height: 600, resizable: true });
  await render(<ResizeGrip />);
  const grip = screen.getByRole('button', { name: 'Resize the editor' });

  // Two pointers, and a cancelled one: userEvent has one mouse.
  fireEvent.pointerDown(grip, { pointerId: 1, screenX: 300, screenY: 200 });
  fireEvent.pointerMove(grip, { pointerId: 2, screenX: 340, screenY: 230 });
  expect(testEditor.requests()).toEqual([]);

  fireEvent.pointerMove(grip, {
    pointerId: 1,
    screenX: 340,
    screenY: 230,
    clientX: 0,
    clientY: 0,
  });
  testEditor.resize({ width: 840, height: 630 });
  fireEvent.pointerMove(grip, {
    pointerId: 1,
    screenX: 355,
    screenY: 240,
    clientX: 500,
    clientY: 600,
  });
  fireEvent(grip, 'pointercancel', { pointerId: 1 });
  fireEvent.pointerMove(grip, { pointerId: 1, screenX: 400, screenY: 300 });

  expect(testEditor.requests()).toEqual([
    { width: 840, height: 630 },
    { width: 855, height: 640 },
    { width: 800, height: 600 },
  ]);
});

test('a fixed editor hides the grip; keyboard resizing uses the current editor size', async () => {
  testEditor.resize({ width: 800, height: 600, resizable: false });
  await render(<ResizeGrip />);
  expect(
    screen.queryByRole('button', { name: 'Resize the editor' }),
  ).toBeNull();

  testEditor.resize({ width: 900, height: 700, resizable: true });
  await screen.findByRole('button', { name: 'Resize the editor' });
  const user = userEvent.setup();
  await user.tab();
  await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
  expect(testEditor.requests()).toEqual([{ width: 950, height: 700 }]);
});
