import type { ReactNode } from 'react';

/** Lightweight stubs for @duncit/ui primitives (the real ones are tested in the package). */

export function StatCard({ label, value, hint, icon, loading }: any) {
  return (
    <div data-testid="stat-card">
      <span data-testid="stat-label">{label}</span>
      <span data-testid="stat-value">{value}</span>
      {icon}
      {hint ? <span data-testid="stat-hint">{hint}</span> : null}
      {loading ? <span data-testid="stat-loading">loading</span> : null}
    </div>
  );
}

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
 * QueryGuard stub. Renders the loading/error branches from props; otherwise it
 * calls the render-prop children so the caller's own guard logic runs.
 */
export function QueryGuard({ loading, error, children }: any): ReactNode {
  if (loading) return <div data-testid="qg-loading">loading</div>;
  if (error) return <div data-testid="qg-error">error</div>;
  return <>{children()}</>;
}
