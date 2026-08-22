# duncit-docs

The browsable reference for every `@duncit/*` shared package.

```bash
pnpm docs         # dev server on http://localhost:2500
pnpm docs:build   # what CI runs (shared-gates → "Docs site builds")
```

**It owns no package content.** Every page is `packages/<name>/docs/index.mdx`, collected
through an Astro content collection, so the prose lives beside the code it describes and moves
with it. To write or change a package page, read
[Writing a package page](http://localhost:2500/writing-docs) — that page is the contract, and
it is itself `src/guides/writing-docs.mdx`.

## What is in here

| Path | What it is |
| --- | --- |
| `src/content.config.ts` | The Zod schema every `docs/index.mdx` frontmatter is validated against. A bad field fails the build, which is a CI gate. |
| `src/layouts/DocsLayout.astro` | Chrome: top bar, package sidebar, "on this page" rail, theme toggle. |
| `src/pages/[...slug].astro` | One page per package. Passes `{ pre: Pre }` into the MDX so every fenced block gets the toolbar. |
| `src/pages/source/[pkg].txt.ts` | Serves a package's raw MDX, which is what the "Open docs/index.mdx" button loads. |
| `src/components/CodeCard.astro` | The frame + toolbar around every block of code on the site. |
| `src/components/mdx/Pre.astro` | The `pre` override that puts MDX fences in a `CodeCard`. |
| `src/components/Preview.astro` | A live example: the real component as a React island, plus its `?raw` source. |
| `src/components/CodePlayground.astro` | The `<dialog>` Monaco mounts into, rendered once per page. |
| `src/scripts/` | Toolbar behaviour, the Monaco playground, theme, sidebar filter, scrollspy. |
| `src/styles/` | `docs.css` for the site, `code.css` for code blocks, Shiki's theme switch and the editor. |
| `src/components/examples/` | The runnable components behind `<Preview>` — see the README there. |

## Two things worth knowing before editing

**Highlighting is built, not run.** `astro.config.mjs` renders every fence with both themes
(`src/shiki-themes.mjs`), light inline and dark as `--shiki-dark*` custom properties.
`styles/code.css` switches between them with one rule keyed on `[data-theme]`. So there is no
highlighter in the browser, and the light/dark toggle costs nothing.

**Monaco is not in the bundle.** `code-actions.ts` imports `playground.ts` dynamically, and
that module pulls Monaco off a CDN through `@monaco-editor/loader` — the same loader the tech,
crm and marketing portals use for MJML, pinned to the same version. A reader who never presses
Edit, Format or Tidy never downloads an editor. The eager script for the whole site is under
5 KB.
