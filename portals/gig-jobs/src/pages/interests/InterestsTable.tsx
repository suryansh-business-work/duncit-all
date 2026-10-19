import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import ContactCell from '../../components/ContactCell';
import { GIG_INTERESTS_ADMIN_TABLE } from '../../queries';
import type { GigInterestAdminRow } from '../../types';

const getRowId = (row: GigInterestAdminRow) => row.id;

const renderSkills = (row: GigInterestAdminRow) => (
  <Stack direction="row" spacing={0.5} component="span" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
    {row.skills.map((skill) => (
      <Chip key={skill} size="small" label={skill} />
    ))}
  </Stack>
);

const renderContact = (row: GigInterestAdminRow) => <ContactCell contact={row.contact} />;

const renderMessage = (row: GigInterestAdminRow) => (
  <Typography variant="body2" component="span" noWrap title={row.message}>
    {row.message}
  </Typography>
);

/**
 * Who said "I'm interested", with the contact that was shared. Every gig's,
 * or one gig's when `jobId` is set (the gig's own dialog).
 */
export default function InterestsTable({ jobId }: Readonly<{ jobId?: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<GigInterestAdminRow>(client, GIG_INTERESTS_ADMIN_TABLE, 'gigInterestsAdminTable', {
    extraVariables: jobId ? { job_id: jobId } : undefined,
  }, [jobId]);
  const columns = useMemo<DuncitColumn<GigInterestAdminRow>[]>(
    () => [
      { field: 'freelancer_name', headerName: t('gigJobs.console.columnFreelancer'), type: 'text', flex: 1, minWidth: 160 },
      ...(jobId
        ? []
        : [{ field: 'job_title', headerName: t('gigJobs.console.columnGig'), type: 'text' as const, flex: 1, minWidth: 200, sortable: false, filterable: false }]),
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
      {
        field: 'skills',
        headerName: t('gigJobs.interests.skills'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        sortable: false,
        filterable: false,
        cellRenderer: renderSkills,
        valueGetter: (row) => row.skills.join(', '),
      },
      {
        field: 'message',
        headerName: t('gigJobs.interest.messageLabel'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        sortable: false,
        filterable: false,
        cellRenderer: renderMessage,
        valueGetter: (row) => row.message,
      },
      dateColumn<GigInterestAdminRow>({ field: 'created_at', headerName: t('gigJobs.console.columnWhen'), hide: false }),
    ],
    [t, jobId]
  );

  return (
    <DuncitTable<GigInterestAdminRow>
      tableId={jobId ? 'gig-job-interests' : 'gig-interests'}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('gigJobs.interests.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('gigJobs.console.searchInterests')}
    />
  );
}
