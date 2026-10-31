import { Alert, Link, List, ListItem, ListItemText, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { useTranslation } from '@duncit/app-settings';
import type { MarketingLeadImportResult } from '../queries';
import { badRows, FIELD_LABEL, IMPORT_FIELDS, type MappingState } from './importMapping';

const PREVIEW_ROWS = 5;

interface PreviewProps {
  rows: readonly string[][];
  mapping: MappingState;
}

/**
 * The first rows as the mapping reads them, and every row that will be
 * skipped with why — the same checks the server makes, shown before anything
 * is sent. A small table of raw cells, not @duncit/table: there is nothing
 * to page, sort or filter here.
 */
export function ImportPreview({ rows, mapping }: Readonly<PreviewProps>) {
  const { t } = useTranslation();
  const mapped = IMPORT_FIELDS.filter((field) => mapping[field] !== null);
  const bad = badRows(rows, mapping, t);
  return (
    <Stack spacing={1} data-testid="import-preview">
      <Typography variant="subtitle2">{t('marketing.leads.previewTitle')}</Typography>
      <Table size="small" aria-label={t('marketing.leads.previewTitle')}>
        <TableHead>
          <TableRow>
            {mapped.map((field) => (
              <TableCell key={field}>{t(FIELD_LABEL[field])}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(0, PREVIEW_ROWS).map((row, index) => (
            <TableRow key={`row-${index}`}>
              {mapped.map((field) => (
                <TableCell key={field}>{row[mapping[field] ?? -1] ?? ''}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {bad.length === 0 ? (
        <Alert severity="success">{t('marketing.leads.noBadRows')}</Alert>
      ) : (
        <Alert severity="warning" data-testid="import-bad-rows">
          {t('marketing.leads.badRowsTitle', { vars: { count: bad.length } })}
          <List dense disablePadding>
            {bad.map((check) => (
              <ListItem key={check.row} disableGutters>
                <ListItemText primary={`${t('marketing.leads.previewRow', { vars: { row: check.row } })} · ${check.problem}`} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
    </Stack>
  );
}

/** How the import went: the counts, the rows the server skipped, and the run on Activity. */
export function ImportOutcome({ result }: Readonly<{ result: MarketingLeadImportResult }>) {
  const { t } = useTranslation();
  const skipped = result.rows.filter((row) => row.outcome === 'SKIPPED');
  return (
    <Stack spacing={1} data-testid="import-result">
      <Alert severity={result.added + result.merged > 0 ? 'success' : 'warning'}>
        {t('marketing.leads.importResult', { vars: { added: result.added, merged: result.merged, skipped: result.skipped } })}{' '}
        <Link component={RouterLink} to="/activity?workflow=LEAD_IMPORT">
          {t('marketing.leads.importSeeRun')}
        </Link>
      </Alert>
      {skipped.length > 0 && (
        <>
          <Typography variant="subtitle2">{t('marketing.leads.importSkippedTitle')}</Typography>
          <List dense disablePadding>
            {skipped.map((row) => (
              <ListItem key={row.row} disableGutters>
                <ListItemText primary={`${t('marketing.leads.previewRow', { vars: { row: row.row } })} · ${row.reason}`} />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Stack>
  );
}
