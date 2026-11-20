# Soundor Components

Controls, charts, and layout primitives for [Soundor](https://soundor.dev/) audio plug-ins. The styled controls use the same Soundor primitives for web and VST3. Headless hooks are available for custom designs.

- [`packages/components`](packages/components): `@soundor/components`, its public APIs, and its tests.
- [`apps/demos`](apps/demos): the Soundor web-runtime app whose builds the documentation embeds as live demos (`?demo=<name>`). It needs Rust with the `wasm32-unknown-unknown` target.
- [`apps/website`](apps/website): standalone component documentation built with Fumadocs on TanStack Start and Vite.

## Development

Use Node from `.nvmrc` and pnpm via Corepack:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm dev
```

`pnpm check` runs Oxfmt, Oxlint, the package and website builds, and the Soundor/Vitest suite. The component tests run against the published Soundor testing toolchain.

## Releases and website

1. Add a changeset with `pnpm changeset` for a package change. Keep the peer range compatible with a published, tested `@soundor/react` version.
2. The **Release** workflow on `main` opens or updates a version PR with the new version, changelog, and lockfile. Merging the PR triggers a verified npm release; Changesets creates the tag and GitHub release. Enable GitHub Actions PR creation for the repo, or provide `RELEASE_PR_TOKEN` with contents and pull-request access if release PRs need to trigger required checks.
3. Configure npm trusted publishing for `soundor/components`, `release.yml`, and environment `npm-production`. If npm requires an existing package to set up trust, a maintainer can bootstrap the versioned package with `pnpm check`, `pnpm --filter @soundor/components pack`, and npm publishing from the verified tarball, then configure the trusted publisher for subsequent versions.
4. In GitHub Pages settings, select **GitHub Actions** as the source. The **Website** workflow builds and deploys `apps/website/dist/client` on website changes and can also be run manually. It targets the `/components/` project path; set `SITE_BASE_PATH=/` when building for a dedicated domain.

The first package release is `0.1.0`. After it is on npm, update the Orbit example and the docs playground in `soundor/soundor` to depend on the published package, then remove the old in-tree package and its release workflow.
