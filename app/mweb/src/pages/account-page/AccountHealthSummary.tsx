import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import HealthMeter from '../../components/health/HealthMeter';
import type { HealthScore } from '../../components/health/queries';
import { useTranslation } from '../../i18n/useTranslation';

function bandHeadline(band: HealthScore['band']): string {
  if (band === 'GREEN') return 'You’re in great shape.';
  if (band === 'YELLOW') return 'A few things to tighten up.';
  return 'Needs attention.';
}

interface Props {
  health: HealthScore;
  onOpen: () => void;
}

/**
 * The account-health card on Profile Settings — the gauge, one line on what
 * the band means, and the score it is made of. The whole card opens the full
 * breakdown, so it carries a chevron rather than a "tap for details" caption.
 * Native twin: components/account/AccountHealthCard.
 */
export default function AccountHealthSummary({ health, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const remarks = health.adjustments.length;
  const delta = health.delta_sum > 0 ? `+${health.delta_sum}` : `${health.delta_sum}`;
  const adjustment = health.delta_sum === 0 ? '' : ` · Admin adjustment: ${delta}`;

  return (
    <Card>
      <CardActionArea onClick={onOpen} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <HealthMeter
            score={health.total_score}
            band={health.band}
            size={112}
            thickness={10}
            label={t('mweb.common.accountHealth')}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{bandHeadline(health.band)}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              Base score: {health.base_score}
              {adjustment}
            </Typography>
            {remarks > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {remarks} admin remark{remarks === 1 ? '' : 's'}.
              </Typography>
            )}
          </Box>
          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
