import type { ReactNode } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { MONITOR_RANGES, isMonitorRange, rangeLabel } from '../labels';
import type { MonitorRange } from '../queries';

interface Props {
  title: string;
  subtitle: string;
  range: MonitorRange;
  onRangeChange: (range: MonitorRange) => void;
  testId: string;
  extra?: ReactNode;
}

/** Every monitor page's title row, with the range picker that drives it. */
export default function MonitorHeader({ title, subtitle, range, onRangeChange, testId, extra }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {extra}
          <TextField
            select
            size="small"
            label={t('tech.graphqlMonitor.range')}
            value={range}
            onChange={(event) => {
              if (isMonitorRange(event.target.value)) onRangeChange(event.target.value);
            }}
            sx={{ minWidth: 170 }}
            slotProps={{ htmlInput: { 'data-testid': `${testId}-range` } }}
          >
            {MONITOR_RANGES.map((option) => (
              <MenuItem key={option} value={option} data-testid={`${testId}-range-${option.toLowerCase()}`}>
                {rangeLabel(t, option)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      }
    />
  );
}
