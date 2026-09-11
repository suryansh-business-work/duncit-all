import { useEffect, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import {
  DEFAULT_HOST_CHART_RANGE,
  hostRangeOptions,
  type HostChartRange,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const [draft, setDraft] = useState<HostChartRange>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const options = hostRangeOptions(hasPods, t);

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={
        <Typography variant="subtitle1" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
          Filter pods by month
        </Typography>
      }
      sheetMaxHeight="70dvh"
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
          <DuncitButton
            variant="outlined"
            size="large"
            startIcon={<CloseIcon />}
            onClick={() => setDraft(DEFAULT_HOST_CHART_RANGE)}
            sx={{ flex: 1 }}
          >
            Reset
          </DuncitButton>
          <DuncitButton
            variant="contained"
            size="large"
            onClick={() => onApply(draft)}
            sx={{ flex: 1 }}
          >
            Apply
          </DuncitButton>
        </Stack>
      }
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        {options.map(([value, label]) => {
          const selected = draft === value;
          return (
            <Chip
              key={value}
              label={label}
              clickable
              color={selected ? 'primary' : 'default'}
              variant="filled"
              onClick={() => setDraft(value)}
              sx={{ height: 36, minHeight: 36, px: 0.5, fontWeight: 600 }}
            />
          );
        })}
      </Stack>
    </ResponsiveDialog>
  );
}
