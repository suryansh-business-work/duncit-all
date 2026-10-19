import { Chip, Stack, Typography } from '@mui/material';
import { dateColumn, rowMenuColumn, type DuncitColumn } from '@duncit/table';
import { gigBudgetText, gigPosterRoleKey, gigStatusKey } from '@duncit/utils';
import ContactCell from '../../components/ContactCell';
import type { GigJobAdminRow } from '../../types';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export interface GigJobRowActions {
  onInterests: (row: GigJobAdminRow) => void;
  onToggleStatus: (row: GigJobAdminRow) => void;
  onDelete: (row: GigJobAdminRow) => void;
}

const renderTitle = (row: GigJobAdminRow) => (
  <Stack component="span" sx={{ lineHeight: 1.25 }}>
    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
      {row.title}
    </Typography>
    <Typography variant="caption" component="span" color="text.secondary">
      {row.category_title} · {row.roles.join(', ')}
    </Typography>
  </Stack>
);

/** Every gig as staff read it: what, who posted it, where, its state and its contact. */
export function buildGigJobColumns(t: Translate, actions: GigJobRowActions): DuncitColumn<GigJobAdminRow>[] {
  return [
    {
      field: 'title',
      headerName: t('gigJobs.console.columnGig'),
      type: 'text',
      flex: 2,
      minWidth: 260,
      cellRenderer: renderTitle,
      valueGetter: (row) => row.title,
    },
    {
      field: 'poster_name',
      headerName: t('gigJobs.console.columnPoster'),
      type: 'text',
      flex: 1,
      minWidth: 180,
      sortable: false,
      valueGetter: (row) => `${row.poster_name} · ${t(gigPosterRoleKey(row.poster_role))}`,
    },
    { field: 'city', headerName: t('gigJobs.console.columnCity'), type: 'text', width: 140 },
    {
      field: 'status',
      headerName: t('gigJobs.console.columnStatus'),
      type: 'text',
      width: 120,
      cellRenderer: (row) => (
        <Chip
          size="small"
          label={t(gigStatusKey(row.status))}
          color={row.status === 'OPEN' ? 'success' : 'default'}
        />
      ),
      valueGetter: (row) => t(gigStatusKey(row.status)),
    },
    {
      field: 'budget',
      headerName: t('gigJobs.detail.budget'),
      type: 'text',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => gigBudgetText(row.budget) ?? t('gigJobs.card.budgetOpen'),
    },
    { field: 'interest_count', headerName: t('gigJobs.console.columnInterested'), type: 'number', width: 120 },
    {
      field: 'contact',
      headerName: t('gigJobs.contact.title'),
      type: 'text',
      minWidth: 200,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <ContactCell contact={row.contact} />,
      valueGetter: (row) => row.contact.phone,
    },
    dateColumn<GigJobAdminRow>({ field: 'created_at', headerName: t('gigJobs.console.columnPosted'), hide: false }),
    rowMenuColumn<GigJobAdminRow>({
      ariaLabel: (row) => t('gigJobs.console.rowActions', { vars: { title: row.title } }),
      items: (row) => [
        { key: 'interests', label: t('gigJobs.console.viewInterests'), onClick: () => actions.onInterests(row) },
        {
          key: 'status',
          label: row.status === 'OPEN' ? t('gigJobs.detail.close') : t('gigJobs.detail.reopen'),
          onClick: () => actions.onToggleStatus(row),
        },
        { key: 'delete', label: t('gigJobs.console.delete'), destructive: true, onClick: () => actions.onDelete(row) },
      ],
    }),
  ];
}
