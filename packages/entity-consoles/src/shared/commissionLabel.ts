/** Chip label for a per-entity commission override (0/null = inherit the global default). */
export const commissionLabel = (pct?: number | null): string =>
  pct && pct > 0 ? `${pct}%` : 'Default';
