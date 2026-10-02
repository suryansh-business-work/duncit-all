import { clubSlotsLabel } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub } from '../create-pod.types';

/** "4 open slots" / "No open slots" for a club — the picker row and the preview. */
export function useClubSlotsLabel(club: Pick<CreatePodClub, 'available_slots_count'>) {
  const { t } = useTranslation();
  return clubSlotsLabel(club, t);
}
