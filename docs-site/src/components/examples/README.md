# Live preview examples

Each file here is a **runnable** example for one shared package. A package's
`docs/index.mdx` imports the component (mounted as a React island by
`<Preview>`) **and** its source via `?raw`, so the snippet printed under the
preview is the code that actually ran.

They live in the docs site rather than next to the package for one mechanical
reason: an example must import the package the way a consumer does
(`import { StatCard } from '@duncit/ui'`), and a package cannot resolve its own
name from inside its own folder. `docs-site` declares `@duncit/ui` and
`@duncit/dialogs` as real dependencies, so the import in the snippet is exactly
the import a portal writes.

Rules for a file in here:

- Import only from the package under test, its peers (MUI/React) and
  `@duncit/utils`. No local helpers — the snippet has to be self-contained.
- Use realistic duncit sample data (pod ids, INR amounts, real statuses), not
  `foo`/`bar`.
- No router. `BackHeader`/`StatCard` render a `RouterLink` only when given
  `to`/`backTo`; the examples use `onBack`/`onClick` so there is no router
  context to mount.
- Keep it short. The whole file is printed on the page.
