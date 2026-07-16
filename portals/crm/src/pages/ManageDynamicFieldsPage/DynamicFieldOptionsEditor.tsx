import { useRef } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CrmDynamicFieldOption } from '../../api/crm.types';

interface Props {
  options: CrmDynamicFieldOption[];
  onChange: (next: CrmDynamicFieldOption[]) => void;
}

/** Edit select options as `{ value, label }` rows — never as one-per-line text. */
export default function DynamicFieldOptionsEditor({ options, onChange }: Readonly<Props>) {
  // Stable per-row keys: option rows have no id and their fields are edited in
  // place, so a content-based key would remount the input and drop focus.
  const rowKeys = useRef<number[]>([]);
  const keySeq = useRef(0);
  if (rowKeys.current.length !== options.length) {
    while (rowKeys.current.length < options.length) rowKeys.current.push(keySeq.current++);
    rowKeys.current.length = options.length;
  }

  const update = (index: number, patch: Partial<CrmDynamicFieldOption>) =>
    onChange(options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  const remove = (index: number) => onChange(options.filter((_, i) => i !== index));
  const add = () => onChange([...options, { value: '', label: '' }]);

  const rows = options.map((opt, index) => ({ opt, index, key: rowKeys.current[index] }));

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Options
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5 }}>
        {rows.map(({ opt, index, key }) => (
          <Stack key={key} direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="Value"
              value={opt.value}
              onChange={(e) => update(index, { value: e.target.value })}
              inputProps={{ 'aria-label': `option-value-${index}` }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Label"
              value={opt.label}
              onChange={(e) => update(index, { label: e.target.value })}
              inputProps={{ 'aria-label': `option-label-${index}` }}
              sx={{ flex: 1 }}
            />
            <Tooltip title="Remove option">
              <IconButton size="small" color="error" aria-label={`remove-option-${index}`} onClick={() => remove(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ alignSelf: 'flex-start' }}>
          Add option
        </Button>
      </Stack>
    </Box>
  );
}
