import { useRef } from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PodPlaceCharge } from '../types';

interface Props {
  value: PodPlaceCharge[];
  onChange: (next: PodPlaceCharge[]) => void;
  helperText?: string;
}

const blank: PodPlaceCharge = { label: '', amount: 0, note: '' };

export default function PlaceChargesField({ value, onChange, helperText }: Readonly<Props>) {
  // Stable per-row keys — never the array index (S6479). Grow with the list by
  // position and survive edits so a row's inputs aren't remounted (losing focus).
  const keysRef = useRef<string[]>([]);
  const nextKeyRef = useRef(0);
  if (keysRef.current.length !== value.length) {
    keysRef.current = value.map((_, i) => keysRef.current[i] ?? `place-charge-${nextKeyRef.current++}`);
  }
  const rows = value.map((row, i) => ({ row, key: keysRef.current[i] }));

  const update = (idx: number, patch: Partial<PodPlaceCharge>) => {
    const next = value.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    onChange(next);
  };
  const add = () => onChange([...value, { ...blank }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Place charges
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {helperText}
        </Typography>
      )}
      <Stack spacing={1.5}>
        {rows.map(({ row, key }, idx) => (
          <Stack
            key={key}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <TextField
              label="Label"
              size="small"
              value={row.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              sx={{ flex: 2 }}
            />
            <TextField
              label="Amount (₹)"
              type="number"
              size="small"
              value={row.amount}
              onChange={(e) => update(idx, { amount: Number(e.target.value) || 0 })}
              inputProps={{ min: 0, max: 100000 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Note"
              size="small"
              value={row.note}
              onChange={(e) => update(idx, { note: e.target.value })}
              sx={{ flex: 2 }}
            />
            <IconButton aria-label="Remove" onClick={() => remove(idx)} size="small">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button startIcon={<AddIcon />} onClick={add} size="small" sx={{ alignSelf: 'flex-start' }}>
          Add charge
        </Button>
      </Stack>
    </Box>
  );
}
