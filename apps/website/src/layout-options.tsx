import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

const base = import.meta.env.BASE_URL;

export const layoutOptions = {
  nav: {
    title: (
      <>
        {/* The wordmark is outlined in the theme's ink: one file per theme. */}
        <img
          src={`${base}soundor-components-logo.svg`}
          alt="Soundor Components"
          height={36}
          className="h-9 w-auto dark:hidden"
        />
        <img
          src={`${base}soundor-components-logo-dark-bg.svg`}
          alt="Soundor Components"
          height={36}
          className="hidden h-9 w-auto dark:block"
        />
      </>
    ),
  },
  githubUrl: 'https://github.com/soundor/components',
  links: [{ text: 'Soundor', url: 'https://soundor.dev/', external: true }],
} satisfies BaseLayoutProps;
