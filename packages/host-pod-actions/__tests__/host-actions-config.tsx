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

/** Echoes the key back, so assertions read as the key that was rendered. */
const t = (key: string) => key;

export const hostActionsConfig = (
  over: Partial<HostPodActionsConfig> = {},
): HostPodActionsConfig => ({
  labels: mwebHostPodLabels(t),
  renderMediaField: ({ value, onChange }) => (
    <textarea aria-label="media" value={value} onChange={(event) => onChange(event.target.value)} />
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
