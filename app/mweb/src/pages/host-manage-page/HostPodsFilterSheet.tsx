import { useEffect, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import {
  DEFAULT_HOST_PODS_FILTERS,
  HOST_PRICE_OPTIONS,
  HOST_TIME_OPTIONS,
  HOST_TYPE_OPTIONS,
  type HostPodsFilters,
} from './hostPodsFilters';

interface Props {
  open: boolean;
  initial: HostPodsFilters;
  onApply: (filters: HostPodsFilters) => void;
  onClose: () => void;
}

/** Single-select chip row for one filter group. */
function ChipRow<T extends string>({
  items,
  value,
  onChange,
}: Readonly<{
  items: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      {items.map(([itemValue, label]) => {
        const selected = value === itemValue;
        return (
          <Chip
            key={itemValue}
            label={label}
            clickable
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => onChange(itemValue)}
            sx={{ height: 32, fontWeight: 600 }}
          />
        );
      })}
    </Stack>
  );
}

/** Staged Type/Time/Price filter for "Your pods": Apply commits the draft, Reset
 * restores the default (Upcoming), the ✕/backdrop closes without changes. */
export default function HostPodsFilterSheet({ open, initial, onApply, onClose }: Readonly<Props>) {
  const [draft, setDraft] = useState<HostPodsFilters>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Filter pods
        </Typography>
      }
      sheetMaxHeight="80dvh"
      actions={
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <DuncitButton
            startIcon={<CloseIcon />}
            onClick={() => setDraft(DEFAULT_HOST_PODS_FILTERS)}
            color="inherit"
          >
            Reset
          </DuncitButton>
          <DuncitButton
            variant="contained"
            onClick={() => onApply(draft)}
            sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
          >
            Apply
          </DuncitButton>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            Type
          </Typography>
          <ChipRow
            items={HOST_TYPE_OPTIONS}
            value={draft.type}
            onChange={(type) => setDraft((d) => ({ ...d, type }))}
          />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            Time
          </Typography>
          <ChipRow
            items={HOST_TIME_OPTIONS}
            value={draft.time}
            onChange={(time) => setDraft((d) => ({ ...d, time }))}
          />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            Price
          </Typography>
          <ChipRow
            items={HOST_PRICE_OPTIONS}
            value={draft.price}
            onChange={(price) => setDraft((d) => ({ ...d, price }))}
          />
        </Stack>
      </Stack>
    </ResponsiveDialog>
  );
}
