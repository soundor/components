import { ThemeProvider } from '@soundor/components/theme';
import { render } from '@soundor/react';

import { demos } from './demos';
import { Frame } from './frame';
import { dark } from './themes';

// The page picks the demo with `?demo=<name>`, the gallery by default, and
// the dark palette with `?theme=dark`. This project only has the web
// runtime, so the page's location is there.
const search =
  (globalThis as { location?: { search: string } }).location?.search ?? '';
const query = new URLSearchParams(search);
const name = query.get('demo') ?? 'gallery';
const Demo = demos[name] ?? demos.gallery!;
const demo = (
  <Frame>
    <Demo />
  </Frame>
);

render(
  query.get('theme') === 'dark' ? (
    <ThemeProvider theme={dark}>{demo}</ThemeProvider>
  ) : (
    demo
  ),
);
