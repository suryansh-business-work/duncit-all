import { IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';

export type ListRow = Record<string, string | number>;

export interface ListColumn {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  /** Choices of a select column. */
  options?: { value: string; label: string }[];
  flex?: number;
}

interface Props {
  title: string;
  rows: ListRow[];
  columns: ListColumn[];
  onChange: (next: ListRow[]) => void;
  newRow: () => ListRow;
  /** Fewest rows the list may hold (the remove button is disabled at this size). */
  min?: number;
  max?: number;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * An editable list of same-shaped rows — a checklist's tasks, a poll's
 * options, a quiz's questions, a formula's terms. One editor, so every list
 * setting adds, removes and validates the same way.
 */
export function ListEditor({ title, rows, columns, onChange, newRow, min = 1, max = 30, hint, error, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const update = (index: number, key: string, value: string | number) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="p">
        {title}
      </Typography>
      {rows.map((row, index) => (
        <Stack key={String(row.key ?? index)} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          {columns.map((column) => (
            <TextField
              key={column.key}
              size="small"
              select={column.kind === 'select'}
              type={column.kind === 'number' ? 'number' : undefined}
              label={column.label}
              value={row[column.key] ?? ''}
              onChange={(e) => update(index, column.key, column.kind === 'number' ? Number(e.target.value) : e.target.value)}
              disabled={disabled}
              sx={{ flex: column.flex ?? 1 }}
            >
              {column.kind === 'select'
                ? (column.options ?? []).map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))
                : null}
            </TextField>
          ))}
          <Tooltip title={t('challenge.toolConfig.list.remove')}>
            <span>
              <IconButton
                aria-label={t('challenge.toolConfig.list.remove')}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                disabled={disabled || rows.length <= min}
              >
                <DeleteOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ))}
      {(error ?? hint) && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </Typography>
      )}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        onClick={() => onChange([...rows, newRow()])}
        disabled={disabled || rows.length >= max}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('challenge.toolConfig.list.add')}
      </DuncitButton>
    </Stack>
  );
}
