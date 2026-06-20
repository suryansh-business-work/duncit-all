import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useKeyedRows } from './useKeyedRows';

interface Props {
  label: string;
  helperText?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

/** Add/remove list of single-line bullet points (Who We Are, Perks, …). */
export default function BulletListField({ label, helperText, value, onChange }: Readonly<Props>) {
  const { rows, add, update, remove } = useKeyedRows<string>(value, onChange);
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        {label}
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      )}
      {rows.map((row, index) => (
        <Stack key={row.id} direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder={`Point ${index + 1}`}
            value={row.value}
            onChange={(e) => update(row.id, e.target.value)}
          />
          <IconButton aria-label={`Remove point ${index + 1}`} onClick={() => remove(row.id)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={() => add('')} sx={{ alignSelf: 'flex-start' }}>
        Add point
      </Button>
    </Stack>
  );
}
