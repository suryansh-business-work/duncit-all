import { useEffect, useState } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import { DEFAULT_HOST_CHART_RANGE, hostRangeOptions, type HostChartRange } from './insights';

interface Props {
  open: boolean;
  initial: HostChartRange;
  hasPods: boolean;
  onApply: (range: HostChartRange) => void;
  onClose: () => void;
}

/** Staged range filter for the "Pods by Month" chart (feature 2): Apply commits,
 * Reset restores the default (Past 6 Months), the ✕/backdrop closes unchanged. */
export default function HostInsightsFilterSheet({
  open,
  initial,
  hasPods,
  onApply,
  onClose,
}: Readonly<Props>) {
  const [draft, setDraft] = useState<HostChartRange>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const options = hostRangeOptions(hasPods);

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          Filter pods by month
        </Typography>
      }
      sheetMaxHeight="70dvh"
      actions={
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <Button
            startIcon={<CloseIcon />}
            onClick={() => setDraft(DEFAULT_HOST_CHART_RANGE)}
            color="inherit"
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={() => onApply(draft)}
            sx={{ flex: 1, borderRadius: 999, fontWeight: 900 }}
          >
            Apply
          </Button>
        </Stack>
      }
    >
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {options.map(([value, label]) => {
          const selected = draft === value;
          return (
            <Chip
              key={value}
              label={label}
              clickable
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => setDraft(value)}
              sx={{ height: 32, fontWeight: 800 }}
            />
          );
        })}
      </Stack>
    </ResponsiveDialog>
  );
}
