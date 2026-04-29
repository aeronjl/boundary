# Boundary

Boundary is a SvelteKit app for transparent psychology experiments. It uses Bun for dependency management and local scripts.

## Development

Install dependencies from the committed Bun lockfile:

```sh
bun install
```

Start the development server:

```sh
bun run dev
```

`bun run dev` applies migrations and seeds local experiment data before Vite starts.

## Database

Local data is stored in `data/boundary.sqlite`, which is ignored by git.

```sh
bun run db:generate # create Drizzle migrations from schema changes
bun run db:migrate  # apply migrations
bun run db:seed     # seed experiment definitions
bun run db:setup    # migrate and seed
```

Production uses Turso/libSQL. Create a Turso database, then set these environment variables in Vercel and locally when targeting production data:

```sh
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Set `ADMIN_TOKEN` to protect `/admin` and the export endpoints:

```sh
ADMIN_TOKEN=...
```

Vercel runs `bun run db:deploy` before each production build via `vercel.json`. To apply
production migrations manually, use:

```sh
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun run db:deploy
```

Check deployment readiness with:

```sh
curl https://www.findboundary.com/health
```

The health endpoint returns `200` only when the app can reach the configured database.

Experiment runs share generic capture tables:

- `experiment_events` records lifecycle and trial events as JSON payloads.
- `experiment_responses` records normalized response payloads, optional scores, and metadata.

Experiment-specific tables, such as `tipi_responses` and `tipi_results`, should be reserved for scoring and analysis fields that need typed columns.

## Reference Data Imports

Reference comparison stats are imported from reviewed summary JSON files. The OpenfMRI
ds000115 n-back candidate summary lives at:

```sh
static/reference-data/n-back/openfmri-ds000115-summary.json
```

Import it into the configured database with:

```sh
bun run reference:import static/reference-data/n-back/openfmri-ds000115-summary.json
```

The importer writes metric stats and provenance, but preserves human review fields by
default. Use `--dry-run` to inspect changes and `--apply-review` only when the summary
review fields should update dataset status, compatibility, and notes.

## Building

Create and preview a production build:

```sh
bun run build
bun run preview
```

## Quality Checks

```sh
bun run check
bun run lint
bun run test
```

Playwright integration tests build and preview the app automatically on port `4174`.
