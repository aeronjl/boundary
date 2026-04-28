# Repository Guidelines

## Project Structure & Module Organization

This is a SvelteKit app. Routes live in `src/routes`, with experiment pages under `src/routes/(experiments)/`. Shared UI and experiment components live in `src/lib/components`; helpers are in `src/lib`; server-only DB code is in `src/lib/server`. Client stores are under `src/stores`. Static experiment data and public assets belong in `static`. Unit tests are colocated in `src`; browser tests live in `tests/`.

## Build, Test, and Development Commands

- `bun install`: install dependencies from `bun.lock`.
- `bun run dev`: start the Vite development server.
- `bun run build`: create a production SvelteKit build.
- `bun run preview`: serve the production build locally.
- `bun run db:setup`: apply Drizzle migrations and seed local experiment data.
- `bun run db:generate`: generate SQL migrations after schema changes.
- `bun run check`: run `svelte-check` with the project TypeScript config.
- `bun run lint`: run Prettier in check mode, then ESLint.
- `bun run format`: apply Prettier formatting.
- `bun run test`: run Playwright, then Vitest.
- `bun run test:unit`: run Vitest only.
- `bun run test:integration`: run Playwright tests only.

## Coding Style & Naming Conventions

Use TypeScript and Svelte conventions already present in the codebase. Prettier uses tabs, single quotes, no trailing commas, and a 100-character print width. ESLint uses flat config in `eslint.config.js`. Shared components use PascalCase; route files use SvelteKit names like `+page.svelte`, `+page.ts`, and `+layout.svelte`. Keep experiment directories kebab-case, matching URL paths such as `n-armed-bandit`.

## Testing Guidelines

Use Vitest for unit-level checks in `src/**/*.{test,spec}.{js,ts}`. Use Playwright for end-to-end route coverage in `tests/` with filenames like `experiment.test.ts`. Add or update tests when route headings, navigation, experiment flow, static data loading, or persistence changes. Run `bun run check`, `bun run lint`, and the relevant test command before opening a PR.

## Commit & Pull Request Guidelines

Recent commits use short, lowercase summaries such as `add display` and `move questions to backend`. Keep the first line concise and behavior-focused; add a body only for context or migration notes. Pull requests should include a description, linked issue when applicable, tests run, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips

Do not commit local secrets, `data/`, or generated build output. Keep public JSON and assets in `static`; keep implementation logic in `src`. Server-only database code belongs under `src/lib/server`. When adding browser-only code, guard direct `window` or `document` access so SvelteKit rendering remains stable.
