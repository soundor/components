import { useEffect, useRef, useState, type ReactNode } from 'react';

const SOURCE =
  'https://github.com/soundor/components/blob/main/apps/demos/src/demos';

export interface DemoProps {
  /** The demo's name: a file of `apps/demos/src/demos`, without `.tsx`. */
  readonly name: string;
  /** The preview's height in pixels. */
  readonly height?: number;
  /**
   * The width the demo is laid out for. Given one, a narrower column shows
   * the whole demo scaled down instead of a part of it to scroll.
   */
  readonly width?: number;
  /** The demos app's dark palette (`?theme=dark`), an application's ThemeProvider override. */
  readonly theme?: 'dark';
  /** Its code, highlighted: added at build time (`remark-demos.ts`). */
  readonly children?: ReactNode;
}

/**
 * A component running live in the web runtime: `apps/demos`' web build, which
 * `scripts/sync-demos.ts` copies to `/demos/`. `?embed` shows the plugin view
 * alone and `demo` picks which one. Its code, from the file the preview runs,
 * is under it.
 */
// The web runtime's page paints its host near-black under the demo. The
// figure's rounded corners clip each layer of the frame on its own, edges
// softened, so that black would show through as a dark rim on every curve.
// Without it, a corner blends the demo's own background with the figure's.
const hostStyle =
  '.soundor-host,.soundor-viewport{background:transparent!important}';

function clearHost(frame: HTMLIFrameElement) {
  try {
    const document = frame.contentDocument;
    if (!document || document.getElementById('demo-embed-style')) return;
    const style = document.createElement('style');
    style.id = 'demo-embed-style';
    style.textContent = hostStyle;
    document.head.append(style);
  } catch {
    // Another origin: the rim stays, and the demo works all the same.
  }
}

export function Demo({
  name,
  height = 260,
  width,
  theme,
  children,
}: DemoProps) {
  const base = import.meta.env.BASE_URL;
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  // On load, and now if it loaded before hydration.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const clear = () => clearHost(node);
    if (node.contentDocument?.readyState === 'complete') clear();
    node.addEventListener('load', clear);
    return () => node.removeEventListener('load', clear);
  }, []);
  useEffect(() => {
    const node = box.current;
    if (!width || !node) return;
    const fit = () => setScale(Math.min(1, node.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);
  const src = `${base}demos/index.html?embed&demo=${encodeURIComponent(name)}${theme ? `&theme=${theme}` : ''}`;
  const title = `The ${name} demo${theme ? `, ${theme}` : ''}, running in the browser`;
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      {width ? (
        // Laid out at its own width and scaled to the column: pointer
        // positions inside the frame follow the transform.
        <div ref={box} style={{ height: height * scale }}>
          <iframe
            ref={frame}
            src={src}
            title={title}
            loading="lazy"
            className="block border-0"
            style={{
              width: scale < 1 ? width : '100%',
              height,
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: '0 0',
            }}
          />
        </div>
      ) : (
        <iframe
          ref={frame}
          // index.html by name: Vite's dev server does not serve a folder's index.
          src={src}
          title={title}
          loading="lazy"
          className="block w-full border-0"
          style={{ height }}
        />
      )}
      {children === undefined ? null : (
        // One scrollbar: the code block's own, made shorter.
        <div className="border-t [&_.fd-scroll-container]:max-h-[360px] [&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0">
          {children}
        </div>
      )}
      <figcaption className="flex items-center justify-between gap-4 border-t px-4 py-2 text-xs text-fd-muted-foreground">
        <span>
          <code>{name}.tsx</code>, running in the web runtime.
        </span>
        <a href={`${SOURCE}/${name}.tsx`} className="hover:text-fd-foreground">
          Source
        </a>
      </figcaption>
    </figure>
  );
}
