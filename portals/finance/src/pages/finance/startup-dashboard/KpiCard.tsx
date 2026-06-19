import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import type { FounderMetric } from './types';
import { formatMetricValue } from './format';
import Sparkline from './Sparkline';

interface Props {
  metric: FounderMetric;
  onInfo: (metric: FounderMetric) => void;
  onSettings: (metric: FounderMetric) => void;
}

function DeltaBadge({ delta }: Readonly<{ delta: number }>) {
  const up = delta >= 0;
  const color = up ? 'success.main' : 'error.main';
  const Arrow = up ? ArrowDropUpIcon : ArrowDropDownIcon;
  return (
    <Stack direction="row" alignItems="center" sx={{ color }}>
      <Arrow fontSize="small" />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {Math.abs(delta).toFixed(1)}%
      </Typography>
    </Stack>
  );
}

export default function KpiCard({ metric, onInfo, onSettings }: Readonly<Props>) {
  const isManual = metric.source === 'manual';
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, pr: 1 }}>
            {metric.label}
          </Typography>
          <Stack direction="row" sx={{ mt: -1, mr: -1 }}>
            <Tooltip title="What is this?">
              <IconButton size="small" onClick={() => onInfo(metric)} aria-label={`About ${metric.label}`}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Formula & settings">
              <IconButton size="small" onClick={() => onSettings(metric)} aria-label={`Settings for ${metric.label}`}>
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          {formatMetricValue(metric.value, metric.unit)}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5, minHeight: 24 }}>
          {metric.delta_pct != null && <DeltaBadge delta={metric.delta_pct} />}
          {isManual && <Chip size="small" variant="outlined" label="Manual" sx={{ height: 20 }} />}
        </Stack>

        <Box sx={{ mt: 1 }}>
          <Sparkline points={metric.series} />
        </Box>
      </CardContent>
    </Card>
  );
}
