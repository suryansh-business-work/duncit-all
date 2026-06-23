import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useKeyedRows } from './useKeyedRows';
import type { ClubFaq } from '../queries';

interface Props {
  value: ClubFaq[];
  onChange: (value: ClubFaq[]) => void;
}

const blankFaq: ClubFaq = { question: '', answer: '' };

/** Add/remove list of FAQ question + answer pairs. */
export default function FaqListField({ value, onChange }: Readonly<Props>) {
  const { rows, add, update, remove } = useKeyedRows<ClubFaq>(value, onChange);
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        FAQs
      </Typography>
      {rows.map((row, index) => (
        <Stack
          key={row.id}
          spacing={1}
          sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              label={`Question ${index + 1}`}
              value={row.value.question}
              onChange={(e) => update(row.id, { ...row.value, question: e.target.value })}
            />
            <IconButton aria-label={`Remove FAQ ${index + 1}`} onClick={() => remove(row.id)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label="Answer"
            value={row.value.answer}
            onChange={(e) => update(row.id, { ...row.value, answer: e.target.value })}
          />
        </Stack>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={() => add({ ...blankFaq })} sx={{ alignSelf: 'flex-start' }}>
        Add FAQ
      </Button>
    </Stack>
  );
}
