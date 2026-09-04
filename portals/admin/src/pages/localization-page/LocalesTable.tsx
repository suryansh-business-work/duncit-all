import {
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { LocaleCoverageRow, LocaleRow } from './queries';

interface Props {
  rows: LocaleRow[];
  /** Locale code -> how much of the catalogue it carries text for. */
  coverage: Record<string, LocaleCoverageRow>;
  onEdit: (row: LocaleRow) => void;
  onDelete: (row: LocaleRow) => void;
  onAutoTranslate: (row: LocaleRow) => void;
}

/**
 * The language list, with how complete each one is.
 *
 * The coverage column is what makes the Auto-translate button next to it mean
 * something: a language sitting at a fraction of the catalogue is the one worth
 * pressing it on, and after a run the same number is how an admin confirms the
 * text actually landed.
 */
export default function LocalesTable({
  rows,
  coverage,
  onEdit,
  onDelete,
  onAutoTranslate,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('admin.localization.code')}</TableCell>
            <TableCell>{t('admin.localization.language')}</TableCell>
            <TableCell>{t('admin.localization.englishName')}</TableCell>
            <TableCell>{t('admin.localization.translated')}</TableCell>
            <TableCell>{t('admin.localization.colFlags')}</TableCell>
            <TableCell align="right">{t('shell.common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const done = coverage[row.code];
            return (
              <TableRow key={row.id} hover>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.english_label || '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {done
                      ? t('admin.localization.runProgress', {
                          vars: { done: done.translated_keys, total: done.total_keys },
                        })
                      : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {row.is_default && (
                      <Chip size="small" color="primary" label={t('admin.roles.default')} />
                    )}
                    {row.is_rtl && <Chip size="small" label="RTL" />}
                    <Chip
                      size="small"
                      color={row.is_active ? 'success' : 'default'}
                      label={row.is_active ? t('shell.common.active') : t('shell.common.inactive')}
                    />
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {/* The source language is what everything else is
                      translated FROM, so there is nothing to fill it in with. */}
                  <Tooltip
                    title={
                      row.is_default
                        ? t('admin.localization.autoTranslateDefault')
                        : t('admin.localization.autoTranslate')
                    }
                  >
                    <span>
                      <DuncitIconButton
                        size="small"
                        color="primary"
                        disabled={row.is_default}
                        onClick={() => onAutoTranslate(row)}
                      >
                        <AutoAwesomeIcon fontSize="small" />
                      </DuncitIconButton>
                    </span>
                  </Tooltip>
                  <DuncitIconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon fontSize="small" />
                  </DuncitIconButton>
                  <Tooltip
                    title={
                      row.is_default
                        ? t('admin.localization.defaultNotRemovable')
                        : t('shell.common.delete')
                    }
                  >
                    <span>
                      <DuncitIconButton
                        size="small"
                        color="error"
                        disabled={row.is_default}
                        onClick={() => onDelete(row)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </DuncitIconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
