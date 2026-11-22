import { Typography } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import { EmailVerdictChip } from '@duncit/shell';
import { dateColumn, rowMenuColumn, type DuncitColumn } from '@duncit/table';
import { PORTAL_ACCESS } from '../../constants/portalAccess';
import { portalNameOf } from '../portal-access-page/helpers';
import type { EmailValidationLogRow } from './queries';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

interface ColumnDeps {
  t: Translate;
  formatDateTime: (value: string) => string;
  onView: (row: EmailValidationLogRow) => void;
  onRevalidate: (row: EmailValidationLogRow) => void;
}

/** The consoles a check can come from — every staff console, not the member app. */
const portalOptions = () =>
  PORTAL_ACCESS.filter((portal) => portal.key !== 'mweb').map((portal) => ({ value: portal.key, label: portal.name }));

/** "7 of 9": tests that passed, of the ones that could run. */
function passedSummary(row: EmailValidationLogRow, t: Translate): string {
  const ran = row.checks.filter((check) => check.passed !== null && check.passed !== undefined);
  const passed = ran.filter((check) => check.passed).length;
  return t('admin.emailValidations.passedOf', { vars: { passed, total: ran.length } });
}

function sourceLabel(row: EmailValidationLogRow, t: Translate): string {
  if (row.revalidated_from) return t('admin.emailValidations.sourceRevalidation');
  return row.source === 'BULK' ? t('admin.emailValidations.sourceBulk') : t('admin.emailValidations.sourceSingle');
}

export function getEmailValidationColumns({
  t,
  formatDateTime,
  onView,
  onRevalidate,
}: Readonly<ColumnDeps>): DuncitColumn<EmailValidationLogRow>[] {
  return [
    {
      field: 'email',
      headerName: t('admin.emailValidations.colEmail'),
      type: 'text',
      flex: 1.4,
      minWidth: 220,
      // Drawn by hand so the row offers Re-validate (which keeps the link to this
      // check) rather than the console-wide Validate button the grid would add.
      cellRenderer: (row) => (
        <Typography variant="body2" noWrap title={row.email}>
          {row.email}
        </Typography>
      ),
    },
    {
      field: 'verdict',
      headerName: t('admin.emailValidations.colVerdict'),
      type: 'enum',
      options: [
        { value: 'VALID', label: t('shell.emailValidation.verdict.valid') },
        { value: 'RISKY', label: t('shell.emailValidation.verdict.risky') },
        { value: 'INVALID', label: t('shell.emailValidation.verdict.invalid') },
      ],
      width: 130,
      cellRenderer: (row) => <EmailVerdictChip verdict={row.verdict} />,
    },
    {
      field: 'checks',
      headerName: t('admin.emailValidations.colChecks'),
      type: 'text',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => passedSummary(row, t),
    },
    {
      field: 'portal',
      headerName: t('admin.emailValidations.colPortal'),
      type: 'enum',
      options: portalOptions(),
      width: 150,
      valueGetter: (row) => portalNameOf(row.portal),
    },
    {
      field: 'source',
      headerName: t('admin.emailValidations.colSource'),
      type: 'enum',
      options: [
        { value: 'SINGLE', label: t('admin.emailValidations.sourceSingle') },
        { value: 'BULK', label: t('admin.emailValidations.sourceBulk') },
      ],
      width: 140,
      valueGetter: (row) => sourceLabel(row, t),
    },
    {
      field: 'suggestion',
      headerName: t('admin.emailValidations.colSuggestion'),
      type: 'text',
      hide: true,
      sortable: false,
      filterable: false,
      minWidth: 180,
    },
    {
      field: 'checked_by',
      headerName: t('admin.emailValidations.colCheckedBy'),
      type: 'text',
      sortable: false,
      minWidth: 200,
      // Staff emails are not validated from here — the row is about the checked address.
      cellRenderer: (row) => (
        <Typography variant="body2" noWrap title={row.checked_by}>
          {row.checked_by || '—'}
        </Typography>
      ),
    },
    dateColumn<EmailValidationLogRow>({
      headerName: t('admin.emailValidations.colCheckedAt'),
      hide: false,
      width: 180,
      formatDate: (date) => formatDateTime(date.toISOString()),
    }),
    rowMenuColumn<EmailValidationLogRow>({
      ariaLabel: (row) => t('admin.emailValidations.actionsFor', { vars: { email: row.email } }),
      items: (row) => [
        {
          key: 'view',
          label: t('admin.emailValidations.view'),
          icon: <VisibilityOutlinedIcon fontSize="small" />,
          onClick: () => onView(row),
        },
        {
          key: 'revalidate',
          label: t('admin.emailValidations.revalidate'),
          icon: <ReplayIcon fontSize="small" />,
          onClick: () => onRevalidate(row),
        },
      ],
    }),
  ];
}
