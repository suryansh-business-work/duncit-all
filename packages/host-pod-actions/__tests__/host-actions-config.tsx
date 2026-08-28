/**
 * The per-surface config every host pod dialog reads, as a test fixture.
 *
 * Four suites mount those dialogs and each needs the same provider around
 * them; the only thing they disagree on is which spies they assert against, so
 * that is the one thing this takes as an override (rule 40 — a helper wanted in
 * more than two places has one home).
 */
import { buildSlotLabels } from '@duncit/slots';
import { mwebPodMediaLabels } from '@duncit/utils';
import { vi } from 'vitest';

import type { HostPodActionsConfig } from '../src/HostPodActionsProvider';
import { mwebHostPodLabels } from '../src/labels';

/**
 * Echoes the key back, so assertions read as the key that was rendered — with
 * the vars appended, because a sentence that names the pod only names it
 * through them: the shipped copy's placeholders are not in the key.
 */
const t = (key: string, options?: { vars?: Record<string, string | number> }) => {
  const vars = Object.values(options?.vars ?? {});
  return vars.length ? `${key} ${vars.join(' ')}` : key;
};

/** The same labels the provider hands the dialogs, for asserting against. */
export const labelsFor = () => mwebHostPodLabels(t);

export const hostActionsConfig = (
  over: Partial<HostPodActionsConfig> = {},
): HostPodActionsConfig => ({
  labels: mwebHostPodLabels(t),
  renderMediaField: ({ value, onChange, error }) => (
    <>
      <textarea aria-label="media" value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span role="alert">{error}</span> : null}
    </>
  ),
  onViewProfile: vi.fn(),
  linkBaseUrl: 'https://duncit.com',
  onOpenFeedback: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  slotLabels: buildSlotLabels(t, 'mweb.slots'),
  podMediaLabels: mwebPodMediaLabels(t),
  ...over,
});
