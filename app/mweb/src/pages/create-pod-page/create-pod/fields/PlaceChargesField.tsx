import { useRef } from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { PodPlaceCharge } from '../create-pod.types';

interface Props {
  value: PodPlaceCharge[];
  onChange: (next: PodPlaceCharge[]) => void;
  helperText?: string;
}

const blank: PodPlaceCharge = { label: '', amount: 0, note: '' };

/** Optional venue-side charges (entry, table, etc.) shown separately to users. */
export default function PlaceChargesField({ value, onChange, helperText }: Readonly<Props>) {
  const { t } = useTranslation();
  // Stable per-row keys (the rows have no id) so edits don't remount inputs and
  // a middle-removal can't shuffle the wrong row — never the array index (S6479).
  const keys = useRef<string[]>([]);
  const seq = useRef(0);
  while (keys.current.length < value.length) {
    seq.current += 1;
    keys.current.push(`charge-${seq.current}`);
  }
  const update = (idx: number, patch: Partial<PodPlaceCharge>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const add = () => onChange([...value, { ...blank }]);
  const remove = (idx: number) => {
    keys.current.splice(idx, 1);
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {t('mweb.createPod.placeCharges')}
      </Typography>
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mb: 1
          }}>
          {helperText}
        </Typography>
      )}
      <Stack spacing={1.5}>
        {value.map((row, idx) => (
          <Stack
            key={keys.current[idx]}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' }
            }}
          >
            <TextField
              label={t('mweb.createPod.chargeLabel')}
              size="small"
              value={row.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              sx={{ flex: 2 }}
            />
            <TextField
              label={t('mweb.createPod.chargeAmount')}
              type="number"
              size="small"
              value={row.amount}
              onChange={(e) => update(idx, { amount: Number(e.target.value) || 0 })}
              sx={{ flex: 1 }}
              slotProps={{
                htmlInput: { min: 0, max: 100000 }
              }}
            />
            <TextField
              label={t('mweb.createPod.chargeNote')}
              size="small"
              value={row.note}
              onChange={(e) => update(idx, { note: e.target.value })}
              sx={{ flex: 2 }}
            />
            <IconButton aria-label={t('mweb.createPod.removeCharge')} onClick={() => remove(idx)} size="small">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button startIcon={<AddIcon />} onClick={add} size="small" sx={{ alignSelf: 'flex-start' }}>
          {t('mweb.createPod.addCharge')}
        </Button>
      </Stack>
    </Box>
  );
}
