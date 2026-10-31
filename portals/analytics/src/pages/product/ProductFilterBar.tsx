import { Stack } from '@mui/material';
import PeriodControls from '../entity-analytics/PeriodControls';
import { PlatformSelect } from '../entity-analytics/FilterSelects';
import type { PeriodState } from '../entity-analytics/period-state';

interface Props {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
}

/** A Product page's controls: the period and the platform. */
export default function ProductFilterBar({ value, onChange }: Readonly<Props>) {
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} sx={{ alignItems: { lg: 'center' }, flexWrap: 'wrap' }}>
      <PeriodControls value={value} onChange={onChange} />
      <PlatformSelect value={value.platform} onChange={(platform) => onChange({ ...value, platform })} />
    </Stack>
  );
}
