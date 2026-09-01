/**
 * A stand-in for `@duncit/tabs`, wired in with
 * `vi.mock('@duncit/tabs', () => import('./support/tabs-stub'))`.
 *
 * The page keeps its CODE/AI selection in the URL through `useTabParam`
 * (rule 40), which needs a react-router `<Router>` above it — and this
 * package does not ship react-router. The stub keeps the same contract,
 * items in and `{ items, value, onChange }` out, backed by state instead of
 * the query string, so a test can still switch tabs and watch the page follow.
 */
import { useState } from 'react';

type Item = { value: string; label: string };

interface TabParamArgs {
  items: readonly Item[];
  fallback: string;
}

export const TAB_PARAM = 'selectedtab';

/** Like the real hook, a pasted `?selectedtab=` link opens on that tab. */
const fromUrl = () => new URLSearchParams(globalThis.location.search).get(TAB_PARAM);

export function useTabParam({ items, fallback }: Readonly<TabParamArgs>) {
  const [value, onChange] = useState(fromUrl() ?? fallback);
  const known = items.some((item) => item.value === value);
  return { items, value: known ? value : fallback, onChange };
}

export function DuncitTabs({ items, value, onChange }: Readonly<ReturnType<typeof useTabParam>>) {
  return (
    <div role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
