import { useState } from 'react';
import { Card, Chip, Divider, Stack, Typography } from '@mui/material';
import type { HealthAdjustment, HealthScore } from './queries';
import SectionHeader from '../SectionHeader';
import HealthRemarkRow from './HealthRemarkRow';
import AppealHealthDialog from './AppealHealthDialog';

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

export default function HealthBreakdown({ score }: Readonly<Props>) {
  const [appealing, setAppealing] = useState<HealthAdjustment | null>(null);
  return (
    <Stack data-testid="health-breakdown" spacing={2.5}>
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
        <SectionHeader testId="health-breakdown-header" title="Admin remarks" />
        {score.adjustments.length === 0 ? (
          <Card data-testid="health-no-remarks" sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No admin adjustments yet. Your score is the default {score.base_score}.
            </Typography>
          </Card>
        ) : (
          <Card>
            <Stack divider={<Divider />}>
              {score.adjustments.map((a) => (
                <HealthRemarkRow key={a.id} adjustment={a} onAppeal={setAppealing} />
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
      <AppealHealthDialog adjustment={appealing} onClose={() => setAppealing(null)} />
    </Stack>
  );
}
