import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, Stack, Typography } from '@mui/material';
import { DuncitTable, activeChipColumn, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import ContactCell from '../../components/ContactCell';
import { FREELANCERS_ADMIN_TABLE } from '../../queries';
import type { FreelancerAdminRow } from '../../types';

const getRowId = (row: FreelancerAdminRow) => row.id;

const renderName = (row: FreelancerAdminRow) => (
  <Stack component="span" sx={{ lineHeight: 1.25 }}>
    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
      {row.display_name}
    </Typography>
    {row.portfolio_url ? (
      <Link href={row.portfolio_url} target="_blank" rel="noopener noreferrer" variant="caption">
        {row.portfolio_url}
      </Link>
    ) : null}
  </Stack>
);

const renderContact = (row: FreelancerAdminRow) => <ContactCell contact={row.contact} />;

/** Everyone who joined as a freelancer from Earn with Duncit, with what they do and how to reach them. */
export default function FreelancersPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<FreelancerAdminRow>(client, FREELANCERS_ADMIN_TABLE, 'freelancersAdminTable');
  const columns = useMemo<DuncitColumn<FreelancerAdminRow>[]>(
    () => [
      {
        field: 'display_name',
        headerName: t('gigJobs.console.columnFreelancer'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderName,
        valueGetter: (row) => row.display_name,
      },
      { field: 'city', headerName: t('gigJobs.console.columnCity'), type: 'text', width: 140 },
      {
        field: 'skills',
        headerName: t('gigJobs.freelancer.skills'),
        type: 'text',
        flex: 2,
        minWidth: 240,
        sortable: false,
        filterable: false,
        valueGetter: (row) => [...row.category_titles, ...row.skills].join(', '),
      },
      { field: 'experience_years', headerName: t('gigJobs.freelancer.experience'), type: 'number', width: 140 },
      {
        field: 'contact',
        headerName: t('gigJobs.contact.title'),
        type: 'text',
        minWidth: 200,
        sortable: false,
        filterable: false,
        cellRenderer: renderContact,
        valueGetter: (row) => row.contact.phone,
      },
      activeChipColumn<FreelancerAdminRow>({ field: 'is_available', headerName: t('gigJobs.freelancer.available') }),
      dateColumn<FreelancerAdminRow>({ field: 'created_at', headerName: t('gigJobs.console.columnJoined'), hide: false }),
    ],
    [t]
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.console.freelancersTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.console.freelancersSubtitle')}
        </Typography>
      </Stack>
      <DuncitTable<FreelancerAdminRow>
        tableId="gig-freelancers"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('gigJobs.console.freelancersEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('gigJobs.console.searchFreelancers')}
      />
    </Stack>
  );
}
