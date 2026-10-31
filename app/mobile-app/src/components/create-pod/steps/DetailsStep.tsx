import type { ReactNode } from 'react';
import { YStack } from 'tamagui';

import { PodSummaryCard } from '../PodSummaryCard';
import { TermsAgreement } from '../TermsAgreement';
import type { CreatePodForm, CreatePodHostCategory, CreatePodVenue } from '../create-pod.types';
import { BasicsStep } from './BasicsStep';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  venues: CreatePodVenue[];
  currencySymbol: string;
  /** Back to Where & when from the summary's Edit. */
  onEditWhen: () => void;
  /** Off in Club Admin mode — the Organizer Terms are the host's undertaking. */
  showTerms: boolean;
  /** Club Admin mode's host assignment, placed before the terms. */
  assignHosts?: ReactNode;
}

/** Step 4 — Details: a summary of what is settled, then what the pod is about,
 * and the Organizer Terms that gate Create Pod. mWeb twin. */
export function DetailsStep({
  form,
  hostCategories,
  venues,
  currencySymbol,
  onEditWhen,
  showTerms,
  assignHosts,
}: Readonly<Props>) {
  return (
    <YStack gap={16} testID="create-pod-details-step">
      <PodSummaryCard form={form} venues={venues} currencySymbol={currencySymbol} onEdit={onEditWhen} />
      <BasicsStep form={form} hostCategories={hostCategories} />
      {assignHosts}
      {showTerms ? <TermsAgreement form={form} /> : null}
    </YStack>
  );
}
