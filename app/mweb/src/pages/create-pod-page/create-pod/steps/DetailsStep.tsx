import { Stack } from '@mui/material';
import PodSummaryCard from '../PodSummaryCard';
import TermsAgreement from '../TermsAgreement';
import BasicsStep from './BasicsStep';
import type { CreatePodForm, CreatePodHostCategory, CreatePodVenue } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  venues: CreatePodVenue[];
  /** Back to Where & when from the summary's Edit. */
  onEditWhen: () => void;
}

/** Step 4 — Details: a summary of what is settled, then what the pod is about,
 * and the Organizer Terms that gate Create Pod. Native twin: DetailsStep. */
export default function DetailsStep({ form, hostCategories, venues, onEditWhen }: Readonly<Props>) {
  return (
    <Stack data-testid="create-pod-details-step" spacing={2}>
      <PodSummaryCard form={form} venues={venues} onEdit={onEditWhen} />
      <BasicsStep form={form} hostCategories={hostCategories} />
      <TermsAgreement form={form} />
    </Stack>
  );
}
