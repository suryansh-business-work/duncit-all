import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PodPlaceCharge } from '../create-pod.types';

interface Props {
  value: PodPlaceCharge[];
  onChange: (next: PodPlaceCharge[]) => void;
  helperText?: string;
}

const blank: PodPlaceCharge = { label: '', amount: 0, note: '' };

/** Optional venue-side charges (entry, table, etc.) shown separately to users. */
export default function PlaceChargesField({ value, onChange, helperText }: Readonly<Props>) {
  const update = (idx: number, patch: Partial<PodPlaceCharge>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
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
        {value.map((row, idx) => (
          <Stack
            key={idx}
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
            <IconButton aria-label="Remove charge" onClick={() => remove(idx)} size="small">
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
