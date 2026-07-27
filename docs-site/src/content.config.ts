import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

/**
 * Every shared package documents itself in its OWN `docs/index.mdx`, so the
 * prose sits next to the code it describes and moves with it. This site only
 * collects them — it owns no package content of its own, which is what stops it
 * drifting from the packages the way a separate docs repo would.
 *
 * A package with no docs/index.mdx simply does not appear; the index page
 * reports those explicitly rather than pretending the set is complete.
 */
const packages = defineCollection({
  loader: glob({ pattern: '*/docs/index.mdx', base: '../packages' }),
  schema: z.object({
    /** Published name, e.g. `@duncit/regex`. */
    name: z.string(),
    /** One line: what a reader gets by importing this. */
    summary: z.string(),
    /** Grouping on the index page. */
    category: z.enum(['domain', 'ui', 'forms', 'platform', 'testing', 'data']),
    /** True when the package pulls no runtime dependency at all. */
    zeroDeps: z.boolean(),
    /** Workspaces that import it today — the reason it is shared. */
    consumers: z.array(z.string()).default([]),
    /** Named exports a reader is most likely to want. */
    exports: z.array(z.string()).default([]),
    /** Whether the package holds its own 100% coverage gate. */
    coverageGate: z.boolean().default(false),
    /** Set when the package must not gain a React/MUI/Tamagui dependency. */
    frameworkFree: z.boolean().default(false),
  }),
});

export const collections = { packages };
