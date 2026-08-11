import { Box, Chip, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import { mailCategoryCopy, type Translator } from '@duncit/app-settings';
import type { MailPreferenceLogRow } from './queries';

const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

/**
 * Who made the change — the account's name over the address it belongs to.
 *
 * Both, not one: a newsletter contact has no account and would be a blank cell,
 * and two people at the same company are told apart by the address, not the
 * name.
 */
const renderPerson = (row: MailPreferenceLogRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    {row.user_name && (
      <Typography variant="body2" fontWeight={700} component="div">
        {row.user_name}
      </Typography>
    )}
    <Typography variant="caption" color="text.secondary" component="div">
      {row.email}
    </Typography>
  </Box>
);

/**
 * The columns for the per-user change log.
 *
 * `t` is passed in rather than read from a hook: this is a plain function the
 * page memoises, and the category names it renders are the SAME sentences mWeb
 * and the native app show on Mail Preference (one bundle, three surfaces).
 */
export function getMailPreferenceLogColumns(
  t: Translator['t'],
  categories: string[],
): DuncitColumn<MailPreferenceLogRow>[] {
  const label = (category: string) => mailCategoryCopy(t, category).label;
  const renderAction = (row: MailPreferenceLogRow) => (
    <Chip
      size="small"
      variant={row.enabled ? 'outlined' : 'filled'}
      color={row.enabled ? 'success' : 'error'}
      label={
        row.enabled
          ? t('mailPreference.analytics.actionOptIn')
          : t('mailPreference.analytics.actionOptOut')
      }
    />
  );

  return [
    {
      field: 'email',
      headerName: t('mailPreference.analytics.columnPerson'),
      flex: 1,
      minWidth: 220,
      cellRenderer: renderPerson,
      valueGetter: (row) => row.user_name || row.email,
    },
    {
      field: 'category',
      headerName: t('mailPreference.analytics.columnCategory'),
      minWidth: 170,
      filter: {
        type: 'select',
        options: categories.map((category) => ({ value: category, label: label(category) })),
      },
      valueGetter: (row) => label(row.category),
    },
    {
      field: 'enabled',
      headerName: t('mailPreference.analytics.columnAction'),
      width: 150,
      filter: { type: 'boolean' },
      cellRenderer: renderAction,
      valueGetter: (row) =>
        row.enabled
          ? t('mailPreference.analytics.actionOptIn')
          : t('mailPreference.analytics.actionOptOut'),
    },
    {
      field: 'source',
      headerName: t('mailPreference.analytics.columnSource'),
      minWidth: 150,
      valueGetter: (row) => row.source_detail || row.source || EM_DASH,
    },
    dateColumn<MailPreferenceLogRow>({
      headerName: t('mailPreference.analytics.columnWhen'),
      width: 180,
      format: DATE_TIME_FORMAT,
    }),
  ];
}
