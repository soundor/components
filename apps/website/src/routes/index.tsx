import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, Cards } from 'fumadocs-ui/components/card';
import {
  CodeBlock,
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
  Pre,
} from 'fumadocs-ui/components/codeblock';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  ExternalLink,
  Keyboard,
  Link2,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

import { Demo } from '../components/demo';
import { SiteFooter } from '../components/site-footer';
import { layoutOptions } from '../layout-options';

export const Route = createFileRoute('/')({ component: Home });

// TSX and the site's two themes only: the full highlighter would ship every
// language shiki knows.
let highlighter: Promise<HighlighterCore> | undefined;
const tsxHighlighter = () =>
  (highlighter ??= createHighlighterCore({
    langs: [import('shiki/langs/tsx.mjs')],
    themes: [
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ],
    engine: createJavaScriptRegexEngine(),
  }));

const managers = [
  ['pnpm', 'pnpm add @soundor/components'],
  ['npm', 'npm install @soundor/components'],
] as const;

const usage = `import { ControlGroup, Knob, Panel, Slider } from '@soundor/components';
import { useState } from 'react';
import { parameters } from 'soundor:parameters';

export function Editor() {
  const [width, setWidth] = useState(0.5);
  return (
    <Panel title="Tone">
      <ControlGroup>
        <Knob parameter={parameters.drive} />
        <Slider label="Width" value={width} onChange={setWidth} />
      </ControlGroup>
    </Panel>
  );
}`;

function Install({ className }: { readonly className?: string }) {
  return (
    <CodeBlockTabs defaultValue="pnpm" className={className}>
      <CodeBlockTabsList>
        {managers.map(([name]) => (
          <CodeBlockTabsTrigger key={name} value={name}>
            {name}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {managers.map(([name, command]) => (
        <CodeBlockTab key={name} value={name}>
          <CodeBlock>
            <Pre>
              {/* One line: the code block lays each child of code on its own. */}
              <code>
                <span className="line">
                  <span className="text-fd-muted-foreground select-none">
                    ${' '}
                  </span>
                  {command}
                </span>
              </code>
            </Pre>
          </CodeBlock>
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );
}

function Home() {
  return (
    <HomeLayout
      {...layoutOptions}
      links={[
        { text: 'Docs', url: '/docs' },
        ...layoutOptions.links.map((link) =>
          link.external
            ? {
                ...link,
                text: (
                  <span className="inline-flex items-center gap-1">
                    {link.text}
                    <ExternalLink aria-hidden className="size-3" />
                  </span>
                ),
              }
            : link,
        ),
      ]}
    >
      <main className="relative isolate w-full overflow-hidden">
        {/* A faint grid behind the hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] [background-image:linear-gradient(to_right,var(--color-fd-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-fd-border)_1px,transparent_1px)] [background-size:48px_48px] opacity-60 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)]"
        />

        <div className="mx-auto max-w-6xl px-6">
          <section className="flex flex-col items-center pt-20 pb-14 text-center sm:pt-28">
            <a
              href="https://soundor.dev/"
              className="mb-6 inline-flex items-center gap-2 rounded-full border bg-fd-card/80 px-3 py-1 text-xs text-fd-muted-foreground backdrop-blur transition-colors hover:text-fd-foreground"
            >
              <AudioWaveform aria-hidden className="size-3.5 text-fd-primary" />
              For Soundor plug-ins · VST3 and the web
              <ArrowRight aria-hidden className="size-3" />
            </a>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Controls for audio plug-ins
            </h1>
            <p className="mt-5 max-w-xl text-lg text-balance text-fd-muted-foreground">
              Knobs, faders, meters and draggable plots that bind to your
              parameters, speak to screen readers, and look the same in a DAW
              and the browser.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                className={buttonVariants({
                  variant: 'primary',
                  className: 'gap-1.5 px-4 py-2.5',
                })}
                to="/docs/$"
                params={{ _splat: '' }}
              >
                Get started
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link
                className={buttonVariants({
                  variant: 'outline',
                  className: 'px-4 py-2.5',
                })}
                to="/docs/$"
                params={{ _splat: 'components/button' }}
              >
                Browse components
              </Link>
            </div>
            <Install className="mt-8 w-full max-w-md text-left" />
          </section>

          <section aria-labelledby="live" className="pb-24">
            {/* One frame, the demo's own border: a ring around it as well
                drew a second, darker line. */}
            <div className="mx-auto max-w-[860px] rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/40 [&_figure]:my-0">
              <Demo name="showcase" width={820} height={500} />
            </div>
            <p
              id="live"
              className="mx-auto mt-5 max-w-2xl text-center text-sm text-fd-muted-foreground"
            >
              A channel strip, running live in the web runtime. Drag the EQ
              bands and the filter, turn the compressor, switch A and B, or
              double-click a value to type it. Every control is a component from
              the library.
            </p>
          </section>

          <section className="pb-24">
            <Heading
              eyebrow="What is in the box"
              title="Everything an editor needs"
              text="Ready-made controls and displays, and the hooks underneath them."
            />
            <Cards className="sm:grid-cols-2 lg:grid-cols-3">
              <Card
                icon={<SlidersHorizontal />}
                title="Controls"
                href="/docs/components/knob"
                description="Knob, Slider, Fader, ValueField, TextField, Button, Toggle and SegmentedControl, in three sizes."
              />
              <Card
                icon={<AudioWaveform />}
                title="Displays"
                href="/docs/components/plot"
                description="Plot draws EQ curves, spectra and envelopes with draggable handles. XYPad and LevelMeter sit beside it."
              />
              <Card
                icon={<Activity />}
                title="Live data"
                href="/docs/guides/live-plot-data"
                description="Feed a plot or a meter from the audio side without a React render per frame."
              />
              <Card
                icon={<Link2 />}
                title="Bound to parameters"
                href="/docs"
                description="Pass a parameter and a control takes its range, formatting and reset value, with host gestures and undo."
              />
              <Card
                icon={<Keyboard />}
                title="Keyboard and screen readers"
                href="/docs/guides/keyboard-and-accessibility"
                description="Every control has keys, labels and hints, and every Plot handle moves with the arrows."
              />
              <Card
                icon={<Palette />}
                title="Headless and themeable"
                href="/docs/utils/theming"
                description="Restyle with tokens and slots, or take the interaction hooks and draw your own."
              />
            </Cards>
          </section>

          <section className="grid gap-10 pb-28 lg:grid-cols-[2fr_3fr] lg:items-center">
            <div>
              <Heading
                align="left"
                eyebrow="Quick start"
                title="From install to editor"
                text="The same components run in a VST3 plug-in and in the browser."
              />
              <div className="prose prose-sm max-w-none">
                <Steps>
                  <Step>
                    <h3>Install</h3>
                    <p>
                      Add the package to a{' '}
                      <a href="https://soundor.dev/docs">Soundor project</a>.
                    </p>
                  </Step>
                  <Step>
                    <h3>Bind</h3>
                    <p>
                      Pass a <code>parameter</code>, or <code>value</code> and{' '}
                      <code>onChange</code> for state of your own.
                    </p>
                  </Step>
                  <Step>
                    <h3>Ship</h3>
                    <p>
                      Build with the Soundor CLI for VST3 or the web: what you
                      see in these docs is what you ship.
                    </p>
                  </Step>
                </Steps>
              </div>
            </div>
            <DynamicCodeBlock
              highlighter={tsxHighlighter}
              options={{
                themes: { light: 'github-light', dark: 'github-dark' },
              }}
              lang="tsx"
              code={usage}
              codeblock={{ title: 'editor.tsx', className: 'my-0' }}
            />
          </section>

          <section className="mb-24 overflow-hidden rounded-2xl border bg-fd-card p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start building your editor
            </h2>
            <p className="mx-auto mt-3 max-w-md text-fd-muted-foreground">
              Every example in the docs is live, with its source beside it.
            </p>
            <Install className="mx-auto mt-6 max-w-md text-left" />
            <Link
              className={buttonVariants({
                variant: 'primary',
                className: 'mt-6 gap-1.5 px-4 py-2.5',
              })}
              to="/docs/$"
              params={{ _splat: '' }}
            >
              Read the docs
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </HomeLayout>
  );
}

function Heading({
  eyebrow,
  title,
  text,
  align = 'center',
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly text: string;
  readonly align?: 'center' | 'left';
}) {
  return (
    <div className={align === 'center' ? 'mb-8 text-center' : 'mb-6'}>
      <p className="mb-2 font-mono text-xs tracking-wider text-fd-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-fd-muted-foreground">{text}</p>
    </div>
  );
}
