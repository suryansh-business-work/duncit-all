/**
 * The four states an application-shaped record moves through, as options.
 *
 * A venue, a host and a club admin all use this lifecycle, and every console
 * spells the four the same way — so the labels resolve from one place rather than
 * once per editor (rules 34 + 38). The keys live under `venueEditor.*` because
 * that is where they were first written; moving them would need new keys, and
 * "Import app keys" never overwrites an existing translation.
 */
export type Translate = (key: string) => string;

export interface LifecycleOption {
  value: string;
  label: string;
}

export const lifecycleOptions = (t: Translate): LifecycleOption[] => [
  { value: 'DRAFT', label: t('directory.venueEditor.statusDraft') },
  { value: 'SUBMITTED', label: t('directory.venueEditor.statusSubmitted') },
  { value: 'APPROVED', label: t('directory.venueEditor.statusApproved') },
  { value: 'REJECTED', label: t('directory.venueEditor.statusRejected') },
];
