import { Box, Card, Chip, Divider, Stack, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import type { HealthScore } from './queries';
import SectionHeader from '../SectionHeader';
import { formatDateTime } from '../../utils/dateFormat';

interface Props {
  score: HealthScore;
}

const BAND_LABEL: Record<HealthScore['band'], string> = {
  RED: 'Needs attention',
  YELLOW: 'Doing OK',
  GREEN: 'In great shape',
};

const BAND_COLOR: Record<HealthScore['band'], 'error' | 'warning' | 'success'> = {
  RED: 'error',
  YELLOW: 'warning',
  GREEN: 'success',
};

type Adjustment = HealthScore['adjustments'][number];

function RemarkRow({ adjustment }: Readonly<{ adjustment: Adjustment }>) {
  const sign = adjustment.delta > 0 ? `+${adjustment.delta}` : `${adjustment.delta}`;
  const color: 'success' | 'error' = adjustment.delta > 0 ? 'success' : 'error';
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 1.75 }}>
      <Chip size="small" color={color} label={sign} sx={{ minWidth: 44 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {adjustment.remark}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {adjustment.created_by_name} · {formatDateTime(adjustment.created_at)} ·{' '}
          {formatDistanceToNow(new Date(adjustment.created_at), { addSuffix: true })}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function HealthBreakdown({ score }: Readonly<Props>) {
  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
              {score.total_score}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              / 100
            </Typography>
          </Stack>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 180, alignItems: 'flex-start' }}>
            <Chip size="small" color={BAND_COLOR[score.band]} label={BAND_LABEL[score.band]} />
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Base score: {score.base_score}
              {score.delta_sum !== 0 && (
                <>
                  {' '}· Admin adjustment: {score.delta_sum > 0 ? `+${score.delta_sum}` : score.delta_sum}
                </>
              )}
            </Typography>
          </Stack>
        </Stack>
      </Card>

      <Stack spacing={1.5}>
        <SectionHeader title="Admin remarks" />
        {score.adjustments.length === 0 ? (
          <Card sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No admin adjustments yet. Your score is the default {score.base_score}.
            </Typography>
          </Card>
        ) : (
          <Card>
            <Stack divider={<Divider />}>
              {score.adjustments.map((a) => (
                <RemarkRow key={a.id} adjustment={a} />
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </Stack>
  );
}
