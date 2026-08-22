import type { ReactNode } from 'react';

/**
 * One runnable example for one shared package.
 *
 * A demo is three things a reader needs at once: the DATA it runs on, the
 * VIEW that data produces, and the SOURCE that turned one into the other.
 * Keeping them in one object is the whole point — a snippet pasted into prose
 * drifts from the code it claims to show within a release, and mock data
 * written separately from the component it feeds drifts even faster.
 *
 * A package shows itself in whichever of the two ways it actually works:
 *
 * - `render` mounts the REAL component with the mock as its props. This is the
 *   answer for anything with a UI.
 * - `compute` calls the package's REAL exports over the mock and names each
 *   result. This is the answer for the framework-free packages, whose whole
 *   surface is functions — "what does `podRefundState` say about this booking"
 *   is their live view.
 *
 * A demo may carry both, and a package that can be neither mounted nor called
 * from a portal (an Astro-only package, say) still ships `mock` + `code`, so
 * every package has something to show rather than a blank panel.
 */
export interface PackageDemo<M = unknown> {
  /** Stable within the package — the portal keys its tabs on it. */
  id: string;
  title: string;
  /** One line telling the reader what to look at. */
  note?: string;
  /**
   * Realistic duncit sample data: real pod ids, INR amounts, actual statuses.
   * Never `foo`/`bar` — a reader copies whatever they see here.
   *
   * The portal renders it as editable JSON and feeds the edited value straight
   * back into `render`/`compute`, so the demo is a sandbox, not a screenshot.
   */
  mock: M;
  /** Mounts the real component with the (possibly edited) mock. */
  render?: (mock: M) => ReactNode;
  /** Runs the real exports over the mock; the record's keys name each result. */
  compute?: (mock: M) => Record<string, unknown>;
}

/** What a `src/demos/<slug>.tsx` module exports. */
export interface PackageDemoModule {
  /** Folder name under `packages/`, e.g. `utils`. Must match the file name. */
  slug: string;
  demos: PackageDemo[];
}

/**
 * Authors a demo with its mock's real type, then erases it for the registry.
 *
 * The registry holds demos for every package at once, so it cannot be generic;
 * without this, every `render` would take `unknown` and each demo would open
 * with a cast of its own. One cast here buys type-checked mock data in all 48.
 */
export function defineDemo<M>(demo: PackageDemo<M>): PackageDemo {
  return demo as PackageDemo;
}

/** A package's whole demo module, with each demo's mock type erased. */
export function defineDemos(slug: string, demos: PackageDemo[]): PackageDemoModule {
  return { slug, demos };
}
