import { render } from '@soundor/react';

import { demos } from './demos';
import { Frame } from './frame';

// The page picks the demo with `?demo=<name>`; the gallery is the default.
// This project only has the web runtime, so the page's location is there.
const search =
  (globalThis as { location?: { search: string } }).location?.search ?? '';
const name = new URLSearchParams(search).get('demo') ?? 'gallery';
const Demo = demos[name] ?? demos.gallery!;

render(
  <Frame>
    <Demo />
  </Frame>,
);
