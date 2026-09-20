import { Stack, Tooltip } from '@mui/material';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { PodSeatsCell } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import type { PodRow } from './queries';
import { isBelowMinPax, podSpotCounts } from './podsColumns.values';

interface Props {
  pod: PodRow;
  /** The club's sub-category floor (0 = none). */
  minPax: number;
  t: Translate;
}

/**
 * Both counts, from the one component admin and Partners share (rule 40). A pod
 * short of its activity's minimum also has its row tinted red; the icon is what
 * names the reason, since colour alone does not (WCAG 1.4.1).
 */
export default function PodSpotsCell({ pod, minPax, t }: Readonly<Props>) {
  const { seats, people, total } = podSpotCounts(pod);
  const cell = <PodSeatsCell seats={seats} bookings={people} total={total} />;
  if (!isBelowMinPax(pod, minPax)) return cell;
  const hint = t('admin.pods.belowMinPax', { vars: { min: minPax } });
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      {cell}
      <Tooltip title={hint}>
        <ErrorOutlinedIcon
          fontSize="small"
          color="error"
          titleAccess={hint}
          data-testid={`pods-below-min-pax-${pod.id}`}
        />
      </Tooltip>
    </Stack>
  );
}
