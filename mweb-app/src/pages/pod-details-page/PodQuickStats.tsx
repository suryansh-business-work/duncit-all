import { Chip, Stack } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface Props {
  views: number;
  spotsTaken: number;
  spotsTotal: number;
}

export default function PodQuickStats({ views, spotsTaken, spotsTotal }: Props) {
  const remaining = spotsTotal > 0 ? Math.max(spotsTotal - spotsTaken, 0) : null;
  const viewLabel = new Intl.NumberFormat(undefined, { notation: 'compact' }).format(views || 0);

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
      {remaining !== null && (
        <Chip
          variant="outlined"
          color={remaining <= 3 ? 'warning' : 'default'}
          icon={<ConfirmationNumberIcon fontSize="small" />}
          label={`${remaining} spots left`}
          size="small"
        />
      )}
      <Chip
        variant="outlined"
        icon={<VisibilityIcon fontSize="small" />}
        label={`${viewLabel} views`}
        size="small"
      />
    </Stack>
  );
}