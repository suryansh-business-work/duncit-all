import type { LifecycleOption, Translate } from '../../shared/lifecycleOptions';

/**
 * A Club Admin's three states.
 *
 * Not the shared four: there is no SUBMITTED, because a Club Admin never applies.
 * The record is drafted by an approved onboarding meeting or by the role grant,
 * so nothing is ever waiting on their side — offering an "Awaiting review" they
 * can never reach would be a state that means nothing.
 */
export const clubAdminStatusOptions = (t: Translate): LifecycleOption[] => [
  { value: 'DRAFT', label: t('directory.clubAdminEditor.statusDraft') },
  { value: 'APPROVED', label: t('directory.venueEditor.statusApproved') },
  { value: 'REJECTED', label: t('directory.venueEditor.statusRejected') },
];
