import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate, Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { HOSTS_TABLE, type HostRow } from '../queries';
import { hostColumns } from './hostColumns';

/**
 * Hosts: every host on Duncit, application and approved alike.
 *
 * Built against the server's own `hostsTable`, so the search, the filters, the
 * sort and the paging are one query. A row opens the record; Add host opens the
 * same editor with nothing in it.
 */
const getRowId = (row: HostRow) => row.id;

export default function HostsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();

  const fetchRows = useApolloTableFetch<HostRow>(client, HOSTS_TABLE, 'hostsTable');
  const columns = useMemo(() => hostColumns(t), [t]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <PersonIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('directory.hosts.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('directory.hosts.subtitle')}
            </Typography>
          </Box>
        </Stack>
        <DuncitButton
          component={RouterLink}
          to="/hosts/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          {t('directory.hostEditor.addHost')}
        </DuncitButton>
      </Stack>

      <DuncitTable<HostRow>
        tableId="hosts-console-list"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('directory.hostEditor.listEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('directory.hostEditor.searchPlaceholder')}
        onRowClick={(row) => navigate(`/hosts/${row.id}`)}
      />
    </Box>
  );
}
