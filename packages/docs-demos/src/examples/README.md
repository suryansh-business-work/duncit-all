# Preview examples (the docs site)

Each file here is a **runnable** example for one shared package, mounted as a React
island by the docs site's `<Preview>` component. A package's `docs/index.mdx` imports
the component **and** its source via `?raw`, so the snippet printed under the preview
is the file that actually ran:

```mdx
import Preview from '@docs/components/Preview.astro';
import { ThemedControls } from '@duncit/docs-demos/examples/ThemedControls.tsx';
import themedControlsSource from '@duncit/docs-demos/examples/ThemedControls.tsx?raw';

<Preview title="A portal's controls under one theme" code={themedControlsSource}>
  <ThemedControls client:load />
</Preview>
```

## These, and the demos next door

This folder and `../demos/` answer the same question for two different renderers:

| | Rendered by | Gets |
| --- | --- | --- |
| `src/examples/` | The docs site (`pnpm docs`), as an Astro island | A static preview plus its source |
| `src/demos/` | The Tech portal, Package Documentation → Live demos | Editable mock data, a live re-render, and its source |

**Write new examples as demos** (`src/demos/<pkg>.tsx`) — they cost the same to write
and a reader gets to change the data. Add a file here only when a docs-site page needs
a mounted island, and prefer reusing a component from this folder in both.

They live in this package rather than inside each documented package for one mechanical
reason: an example must import the package the way a consumer does
(`import { StatCard } from '@duncit/ui'`), and a package cannot resolve its own name
from inside its own folder. `@duncit/docs-demos` declares every `@duncit/*` package as a
real dependency, so the import in the snippet is exactly the import a portal writes.

## Rules for a file in here

- Import only from the package under test, its peers (MUI/React) and `@duncit/utils`.
  No local helpers — the whole file is printed on the page, so it has to stand alone.
- Use realistic duncit sample data (pod ids, INR amounts, real statuses), not
  `foo`/`bar`. A reader copies whatever they see.
- No router. `BackHeader`/`StatCard` render a `RouterLink` only when given `to`/`backTo`;
  these examples use `onBack`/`onClick`, so there is no router context to mount.
- Keep it short.
