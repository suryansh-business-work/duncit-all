import { Typography } from '@mui/material';
import { EM_DASH, dateColumn, entityIdColumn, type DuncitColumn } from '@duncit/table';
import {
  policyAcceptanceMethodLabel,
  type DateFormatter,
  type Translator,
} from '@duncit/app-settings';
import {
  POLICY_ACCEPTANCE_METHODS,
  type PolicyAcceptance,
} from '../../graphql/policyAcceptance';

const renderPerson = (row: PolicyAcceptance) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {row.user_name || EM_DASH}
  </Typography>
);

const renderPolicy = (row: PolicyAcceptance) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {row.policy_title}
  </Typography>
);

/**
 * The acceptance log's columns.
 *
 * Every policy value rendered here is the ROW's own copy, never a lookup:
 * `deletePolicy` is a hard delete, and a table that joined would show a blank
 * where the thing somebody agreed to should be.
 *
 * Name and email are the opposite — resolved at read time, so a renamed account
 * reads correctly — and that is also why neither is sortable: they are joined
 * AFTER the page is fetched, so a sort on them would silently do nothing. The
 * server allowlist (ACCEPTANCE_TABLE_CONFIG) sorts accepted_at, policy_no,
 * policy_slug, policy_title, policy_updated_at, method and surface, and filters
 * the same set with method and surface as enums.
 *
 * `t` is passed in rather than read from a hook so this stays a plain function
 * the page memoises.
 */
export function getPolicyAcceptanceColumns(
  t: Translator['t'],
  formatDateTime: DateFormatter['formatDateTime'],
): DuncitColumn<PolicyAcceptance>[] {
  const methodLabel = (method: string) => policyAcceptanceMethodLabel(t, method);
  const renderMethod = (row: PolicyAcceptance) => (
    <Typography variant="body2" component="span">
      {methodLabel(row.method)}
    </Typography>
  );

  return [
    dateColumn<PolicyAcceptance>({
      field: 'accepted_at',
      headerName: t('legalAcceptanceLogs.colWhen'),
      hide: false,
      minWidth: 190,
      formatDate: formatDateTime,
    }),
    {
      field: 'user_name',
      headerName: t('legalAcceptanceLogs.colUser'),
      sortable: false,
      minWidth: 170,
      cellRenderer: renderPerson,
      valueGetter: (row) => row.user_name || EM_DASH,
    },
    {
      field: 'user_email',
      headerName: t('legalAcceptanceLogs.colEmail'),
      sortable: false,
      minWidth: 220,
      valueGetter: (row) => row.user_email || EM_DASH,
    },
    {
      field: 'policy_title',
      headerName: t('legalAcceptanceLogs.colPolicy'),
      flex: 1,
      minWidth: 200,
      filter: { type: 'text' },
      cellRenderer: renderPolicy,
      valueGetter: (row) => row.policy_title,
    },
    entityIdColumn<PolicyAcceptance>({
      field: 'policy_no',
      headerName: t('legalAcceptanceLogs.colPolicyNo'),
    }),
    {
      field: 'method',
      headerName: t('legalAcceptanceLogs.colMethod'),
      minWidth: 160,
      filter: {
        type: 'select',
        options: POLICY_ACCEPTANCE_METHODS.map((value) => ({ value, label: methodLabel(value) })),
      },
      cellRenderer: renderMethod,
      valueGetter: (row) => methodLabel(row.method),
    },
    {
      // Echoed straight from the database (MWEB / APP / PORTAL …) — a stored
      // value rather than a sentence, so it carries no translation key.
      field: 'surface',
      headerName: t('legalAcceptanceLogs.colSurface'),
      width: 120,
      filter: { type: 'text' },
      valueGetter: (row) => row.surface,
    },
  ];
}
