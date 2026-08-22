import {
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/shell';
import { useState } from 'react';
import {
  removeCategory,
  renameCategory,
  toggleCategory,
  type EditableCategory,
} from './categories';

type RowProps = Readonly<{
  category: EditableCategory;
  shownLabel: string;
  removeLabel: string;
  onChange: (rows: EditableCategory[]) => void;
  rows: EditableCategory[];
}>;

function CategoryRow({ category, shownLabel, removeLabel, onChange, rows }: RowProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <TextField
        size="small"
        value={category.label}
        onChange={(event) => onChange(renameCategory(rows, category.uid, event.target.value))}
        sx={{ flex: 1 }}
      />
      {category.key && <Chip size="small" variant="outlined" label={category.key} />}
      <FormControlLabel
        control={
          <Switch
            checked={category.is_active}
            onChange={(event) => onChange(toggleCategory(rows, category.uid, event.target.checked))}
          />
        }
        label={shownLabel}
      />
      <IconButton
        color="error"
        aria-label={`${removeLabel}: ${category.label}`}
        onClick={() => onChange(removeCategory(rows, category.uid))}
      >
        <DeleteIcon />
      </IconButton>
    </Stack>
  );
}

type Props = Readonly<{
  rows: EditableCategory[];
  onChange: (rows: EditableCategory[]) => void;
  onAdd: (label: string) => void;
}>;

/** The chips a reporter picks from, edited in place. */
export default function CategoryList({ rows, onChange, onAdd }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    onAdd(label);
    setDraft('');
  };

  return (
    <>
      <Typography variant="subtitle1" fontWeight={700}>
        {t('support.problemSettings.categories')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('support.problemSettings.categoriesHint')}
      </Typography>

      <Stack spacing={1}>
        {rows.map((category) => (
          <CategoryRow
            key={category.uid}
            category={category}
            rows={rows}
            onChange={onChange}
            shownLabel={t('support.problemSettings.shown')}
            removeLabel={t('support.problemSettings.removeCategory')}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField
          size="small"
          label={t('support.problemSettings.newCategory')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button startIcon={<AddIcon />} onClick={add} disabled={!draft.trim()}>
          {t('support.problemSettings.add')}
        </Button>
      </Stack>
    </>
  );
}
