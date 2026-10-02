import { Chip } from '@mui/material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import type { CreatePodClub } from '../create-pod.types';
import { useClubSlotsLabel } from './useClubSlotsLabel';

interface Props {
  club: Pick<CreatePodClub, 'available_slots_count'>;
}

/** The picked club's open venue slots, beside its venue count in the preview. */
export default function ClubSlotsChip({ club }: Readonly<Props>) {
  const { open, label } = useClubSlotsLabel(club);
  return (
    <Chip
      data-testid="club-preview-slot-count"
      size="small"
      variant="outlined"
      color={open ? 'default' : 'warning'}
      icon={<EventAvailableOutlinedIcon />}
      label={label}
    />
  );
}
