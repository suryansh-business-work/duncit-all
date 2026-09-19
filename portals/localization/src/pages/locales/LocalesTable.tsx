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
import type { LocaleCoverageRow, LocaleRow } from '../../lib/queries';

interface CoverageProps {
  coverage: LocaleCoverageRow | undefined;
}

/**
 * `9,120 of 11,400` and, when some of that text was written against English
 * that has changed since, how much — the number a sync with English clears.
 */
function Coverage({ coverage }: Readonly<CoverageProps>) {
  const { t } = useTranslation();
  if (!coverage) return <Typography variant="body2">—</Typography>;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('localization.locales.coverage', {
          vars: { done: coverage.translated_keys, total: coverage.total_keys },
        })}
      </Typography>
      {coverage.outdated_keys > 0 && (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={t('localization.locales.outdated', { count: coverage.outdated_keys })}
        />
      )}
    </Stack>
  );
}

interface Props {
  rows: LocaleRow[];
  /** Locale code -> how much of the catalogue it carries text for. */
  coverage: Record<string, LocaleCoverageRow>;
  onEdit: (row: LocaleRow) => void;
  onDelete: (row: LocaleRow) => void;
  onAiTranslate: (row: LocaleRow) => void;
}

/**
 * The language list, with how complete — and how current — each one is. After
 * a run the same numbers are how an admin confirms the text actually landed.
 */
export default function LocalesTable({ rows, coverage, onEdit, onDelete, onAiTranslate }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('localization.locales.code')}</TableCell>
            <TableCell>{t('localization.locales.language')}</TableCell>
            <TableCell>{t('localization.locales.englishName')}</TableCell>
            <TableCell>{t('localization.locales.translated')}</TableCell>
            <TableCell>{t('localization.locales.colFlags')}</TableCell>
            <TableCell align="right">{t('shell.common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const translateTitle = row.is_default
              ? t('localization.locales.aiTranslateDefault')
              : t('localization.locales.aiTranslate');
            const deleteTitle = row.is_default
              ? t('localization.locales.defaultNotRemovable')
              : t('shell.common.delete');
            return (
              <TableRow key={row.id} hover>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.english_label || '—'}</TableCell>
                <TableCell>
                  <Coverage coverage={coverage[row.code]} />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {row.is_default && (
                      <Chip size="small" color="primary" label={t('localization.locales.defaultChip')} />
                    )}
                    {row.is_rtl && <Chip size="small" label={t('localization.locales.rtlChip')} />}
                    <Chip
                      size="small"
                      color={row.is_active ? 'success' : 'default'}
                      label={row.is_active ? t('shell.common.active') : t('shell.common.inactive')}
                    />
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {/* The source language is what everything else is
                      translated FROM, so there is nothing to fill it in with. */}
                  <Tooltip title={translateTitle}>
                    <span>
                      <DuncitIconButton
                        size="small"
                        color="primary"
                        aria-label={translateTitle}
                        data-testid="locales-table-ai-translate"
                        disabled={row.is_default}
                        onClick={() => onAiTranslate(row)}
                      >
                        <AutoAwesomeIcon fontSize="small" />
                      </DuncitIconButton>
                    </span>
                  </Tooltip>
                  <DuncitIconButton
                    size="small"
                    aria-label={t('localization.locales.edit', { vars: { code: row.code } })}
                    data-testid="locales-table-edit"
                    onClick={() => onEdit(row)}
                  >
                    <EditIcon fontSize="small" />
                  </DuncitIconButton>
                  <Tooltip title={deleteTitle}>
                    <span>
                      <DuncitIconButton
                        size="small"
                        color="error"
                        aria-label={deleteTitle}
                        data-testid="locales-table-delete"
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
