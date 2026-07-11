import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { dayStateColor, stateLabel } from '../utils/status';
import type { DailyBar } from '../types';

interface StripProps {
  daily: DailyBar[];
  height?: number;
}

/**
 * The status.io-style 90-day uptime strip: one thin vertical bar per day,
 * coloured by that day's state. Lightweight (plain boxes + native tooltips) so
 * it stays cheap even rendered once per service row.
 */
export default function UptimeBarStrip({ daily, height = 30 }: Readonly<StripProps>) {
  const theme = useTheme();
  if (daily.length === 0) return null;
  const operationalDays = daily.filter((day) => day.state === 'operational').length;
  return (
    <Box
      role="img"
      aria-label={`Uptime over the last ${daily.length} days: ${operationalDays} fully operational`}
      sx={{ display: 'flex', gap: '2px', height, alignItems: 'stretch', width: '100%' }}
    >
      {daily.map((day) => (
        <Box
          key={day.date}
          component="span"
          title={`${day.date} · ${day.uptime.toFixed(2)}% · ${stateLabel(day.state)}`}
          sx={{
            flex: 1,
            minWidth: '2px',
            borderRadius: '2px',
            bgcolor: dayStateColor(day.state, theme),
            opacity: 0.88,
            transition: 'opacity .15s ease',
            '&:hover': { opacity: 1 },
          }}
        />
      ))}
    </Box>
  );
}
