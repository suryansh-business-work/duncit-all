import { useRef } from 'react';
import { Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface Props {
  options: string[];
  onChange: (next: string[]) => void;
}

/**
 * Discrete option editor for MCQ choices — each option is its own field with
 * add / remove / reorder controls. No multiline textarea, no newline-splitting:
 * options are always a plain string array.
 */
export default function OptionsEditor({ options, onChange }: Readonly<Props>) {
  const list = options.length ? options : [''];
  const rowKeys = useRef<{ keys: string[]; seq: number }>({ keys: [], seq: 0 });
  if (rowKeys.current.keys.length !== list.length) {
    const keys = rowKeys.current.keys.slice(0, list.length);
    while (keys.length < list.length) {
      rowKeys.current.seq += 1;
      keys.push(`opt-${rowKeys.current.seq}`);
    }
    rowKeys.current.keys = keys;
  }
  const set = (i: number, val: string) => onChange(list.map((o, idx) => (idx === i ? val : o)));
  const add = () => onChange([...list, '']);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i).length ? list.filter((_, idx) => idx !== i) : ['']);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Options</Typography>
      {list.map((opt, i) => {
        const rowKey = rowKeys.current.keys[i];
        return (
        <Stack key={rowKey} direction="row" spacing={0.5} alignItems="center">
          <TextField
            size="small"
            fullWidth
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) => set(i, e.target.value)}
            inputProps={{ 'aria-label': `Option ${i + 1}` }}
          />
          <Tooltip title="Move up"><span><IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
          <Tooltip title="Move down"><span><IconButton size="small" onClick={() => move(i, 1)} disabled={i === list.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
          <Tooltip title="Remove option"><IconButton size="small" color="error" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
        );
      })}
      <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ alignSelf: 'flex-start' }}>Add option</Button>
    </Stack>
  );
}
