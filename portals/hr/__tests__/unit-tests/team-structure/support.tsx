import type { PayLine, TeamNode } from '../../../src/pages/team-structure/types';

/**
 * Translator used by these tests: returns the key, plus its variables when it
 * has any. The tests then assert on the exact key a screen asks for, so they
 * neither depend on English copy nor on which bundle the fallback loaded.
 */
export const tKey = (key: string, options?: { vars?: Record<string, unknown> }) =>
  options?.vars ? `${key}|${JSON.stringify(options.vars)}` : key;

/** Replaces only `useTranslation`; everything else in @duncit/app-settings stays real. */
export const withKeys = <T extends object>(actual: T): T => ({ ...actual, useTranslation: () => ({ t: tKey }) });

export const seat = (id: string, over: Partial<TeamNode> = {}): TeamNode => ({
  id,
  structure_id: 's1',
  parent_id: null,
  kind: 'ROLE',
  title: `Seat ${id}`,
  employment_type: 'FULL_TIME',
  status: 'FILLED',
  sort_order: 0,
  pay: [],
  monthly_cost: 0,
  kras: [],
  ...over,
});

export const fixedLine = (over: Partial<PayLine> = {}): PayLine => ({
  label: 'Base',
  kind: 'FIXED',
  frequency: 'MONTHLY',
  amount: 10000,
  min_amount: null,
  max_amount: null,
  note: null,
  ...over,
});

export const structure = { id: 's1', name: 'Core Team', description: 'The core', currency: 'INR' };
