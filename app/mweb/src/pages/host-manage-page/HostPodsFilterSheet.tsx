import { useEffect, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
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
  testIdPrefix,
}: Readonly<{
  items: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
  testIdPrefix: string;
}>) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      {items.map(([itemValue, label]) => {
        const selected = value === itemValue;
        const chipTestId = `${testIdPrefix}-${itemValue}`;
        return (
          <Chip
            key={itemValue}
            data-testid={chipTestId}
            label={label}
            clickable
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => onChange(itemValue)}
            sx={{ height: 36, minHeight: 36 }}
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
        <Typography variant="subtitle1" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
          Filter pods
        </Typography>
      }
      sheetMaxHeight="80dvh"
      actions={
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <DuncitButton
            data-testid="host-filter-reset"
            variant="outlined"
            size="large"
            onClick={() => setDraft(DEFAULT_HOST_PODS_FILTERS)}
            color="inherit"
            sx={{ flex: 1, borderColor: 'divider' }}
          >
            Reset
          </DuncitButton>
          <DuncitButton
            data-testid="host-filter-apply"
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
      <Stack spacing={2}>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            Type
          </Typography>
          <ChipRow
            items={HOST_TYPE_OPTIONS}
            value={draft.type}
            onChange={(type) => setDraft((d) => ({ ...d, type }))}
            testIdPrefix="host-filter-type"
          />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            Time
          </Typography>
          <ChipRow
            items={HOST_TIME_OPTIONS}
            value={draft.time}
            onChange={(time) => setDraft((d) => ({ ...d, time }))}
            testIdPrefix="host-filter-time"
          />
        </Stack>
        <Stack spacing={0.8}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            Price
          </Typography>
          <ChipRow
            items={HOST_PRICE_OPTIONS}
            value={draft.price}
            onChange={(price) => setDraft((d) => ({ ...d, price }))}
            testIdPrefix="host-filter-price"
          />
        </Stack>
      </Stack>
    </ResponsiveDialog>
  );
}
