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

## The other home, and which one to use

Runnable examples now have a second, larger home: **`packages/docs-demos`**, whose
demo modules the **Tech portal** renders under Package Documentation → Live demos.
Every one of the 49 shared packages has one there; this folder has seven, and only
`@duncit/dialogs`, `@duncit/theme` and `@duncit/ui` still import from it.

They exist for two different renderers — these are Astro islands mounted by
`<Preview>`, those are React modules loaded by a portal — but they answer the same
question, so **write new examples in `packages/docs-demos/src/demos/<pkg>.tsx`** and
leave this folder to the three pages that already use it. A demo there gets editable
mock data and its own source for free (see rule 42 in `AGENTS.md`).

Folding these seven into that package is a pending cleanup, not a new decision: the
reason given above for not putting examples inside a package — that a package cannot
resolve its own name from inside its own folder — does not apply to `docs-demos`,
which is a different package and imports `@duncit/ui` exactly as a portal does.
