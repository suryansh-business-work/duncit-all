import type { ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { DocumentNode } from 'graphql';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';

/**
 * A console's list: the heading, the way to add one, and the table.
 *
 * The hosts and club-admins lists are the same screen over a different entity —
 * heading, Add, a server-side table, a row that opens the record — so the frame
 * is written once and each console supplies its columns, its query and its copy
 * (rule 34). The venues list keeps its own page: it carries a category filter
 * pinned outside the table and a refetch handle its row actions use, and folding
 * those in would make this configurable rather than shared.
 */
export interface ConsoleListPageProps<Row extends { id: string }> {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Where Add goes, e.g. `/hosts/new`. Omitted hides the button. */
  addTo?: string;
  addLabel?: string;
  /** The console's server-side table document and its result key. */
  document: DocumentNode;
  resultKey: string;
  columns: DuncitColumn<Row>[];
  tableId: string;
  emptyText: string;
  searchPlaceholder: string;
  defaultSortField: string;
  /** Where a row opens, e.g. `/hosts/:id`. */
  rowPath: (row: Row) => string;
}

export default function ConsoleListPage<Row extends { id: string }>({
  icon,
  title,
  subtitle,
  addTo,
  addLabel,
  document,
  resultKey,
  columns,
  tableId,
  emptyText,
  searchPlaceholder,
  defaultSortField,
  rowPath,
}: Readonly<ConsoleListPageProps<Row>>) {
  const client = useApolloClient();
  const navigate = useNavigate();
  const fetchRows = useApolloTableFetch<Row>(client, document, resultKey);

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
          {icon}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          </Box>
        </Stack>
        {addTo && (
          <DuncitButton
            component={RouterLink}
            to={addTo}
            variant="contained"
            startIcon={<AddIcon />}
          >
            {addLabel}
          </DuncitButton>
        )}
      </Stack>

      <DuncitTable<Row>
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
        emptyText={emptyText}
        defaultSort={{ field: defaultSortField, dir: 'desc' }}
        searchPlaceholder={searchPlaceholder}
        onRowClick={(row) => navigate(rowPath(row))}
      />
    </Box>
  );
}
