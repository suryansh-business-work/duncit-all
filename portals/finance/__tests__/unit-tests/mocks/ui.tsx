import type { ReactNode } from 'react';

/** Lightweight stubs for @duncit/ui primitives (the real ones are tested in the package). */

export function StatCard({ label, value, hint, hintColor, icon, loading }: any) {
  return (
    <div data-testid="stat-card">
      <span data-testid="stat-label">{label}</span>
      <span data-testid="stat-value">{value}</span>
      {icon}
      {/* `hintColor` is the tile's whole verdict — green when a number is where
          it should be, amber when it is not — so it has to be assertable. */}
      {hint ? (
        <span data-testid="stat-hint" data-hint-color={hintColor}>
          {hint}
        </span>
      ) : null}
      {loading ? <span data-testid="stat-loading">loading</span> : null}
    </div>
  );
}

/**
 * The page title block is the REAL one: it is a `<Typography>` pair over MUI
 * with no data behind it, so a stub would only be a second copy of it — and
 * omitting it made `PageHeader` reach a page as `undefined`, which takes the
 * whole screen down at the first line of its render.
 */
export { PageHeader } from '../../../../../packages/ui/src/PageHeader';

export function StatusChip({ status, label }: any) {
  return <span data-testid="status-chip">{label ?? status}</span>;
}

export function InfoRow({ label, value }: any) {
  return (
    <div data-testid="info-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * The debounce hook is the real one — a stub that returned the value unchanged
 * would quietly delete the delay these pages are built around, and one that
 * omitted it made the import `undefined`.
 */
export { useDebouncedValue } from '../../../../../packages/ui/src/useDebouncedValue';

/**
 * The timeline is the shared account of what happened to a pod, and Backout
 * Refunds asserts on its wording, so the real component renders here too.
 */
export { PodParticipationTimeline } from '../../../../../packages/ui/src/PodParticipationTimeline';

/**
 * QueryGuard stub. Renders the loading/error branches from props; otherwise it
 * calls the render-prop children so the caller's own guard logic runs.
 */
export function QueryGuard({ loading, error, children }: any): ReactNode {
  if (loading) return <div data-testid="qg-loading">loading</div>;
  if (error) return <div data-testid="qg-error">error</div>;
  return <>{children()}</>;
}
