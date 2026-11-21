import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

// The repository's brand files, which the README shows too.
import logoDark from '../../../assets/brand/soundor-components-logo-dark-bg.svg?url';
import logo from '../../../assets/brand/soundor-components-logo.svg?url';

export const layoutOptions = {
  nav: {
    title: (
      <>
        {/* The wordmark is outlined in the theme's ink: one file per theme. */}
        <img
          src={logo}
          alt="Soundor Components"
          height={36}
          className="h-9 w-auto dark:hidden"
        />
        <img
          src={logoDark}
          alt="Soundor Components"
          height={36}
          className="hidden h-9 w-auto dark:block"
        />
      </>
    ),
  },
  githubUrl: 'https://github.com/soundor/components',
  links: [
    // In the header only: the sidebar lists the page itself, last.
    { text: 'Changelog', url: '/docs/changelog', on: 'nav' },
    { text: 'Icons', url: 'https://icons.soundor.dev/', external: true },
    { text: 'Soundor', url: 'https://soundor.dev/', external: true },
  ],
} satisfies BaseLayoutProps;
