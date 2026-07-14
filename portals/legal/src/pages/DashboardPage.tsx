import { useCallback } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { DuncitTable, tableQueryToGql, type DuncitColumn, type TableQueryState } from '@duncit/table';
import {
  LEGAL_DOCUMENT_STATS,
  LEGAL_DOCUMENT_STATS_TABLE,
  type LegalDocumentStats,
  type LegalDocumentTypeCount,
} from '../graphql/documents';

// Aggregate rows are keyed by document_type (no id field on the server type).
const getStatsRowId = (r: LegalDocumentTypeCount) => r.document_type;

// Allowlists (LEGAL_DOCUMENT_STATS_TABLE_CONFIG): sort document_type/count;
// filter document_type (text) + count (number).
const STATS_COLUMNS: DuncitColumn<LegalDocumentTypeCount>[] = [
  { field: 'document_type', headerName: 'Document type', flex: 1, minWidth: 220, filter: { type: 'text' } },
  { field: 'count', headerName: 'Count', width: 110, filter: { type: 'number' } },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading } = useQuery<{ legalDocumentStats: LegalDocumentStats }>(
    LEGAL_DOCUMENT_STATS,
    { fetchPolicy: 'cache-and-network' }
  );
  const stats = data?.legalDocumentStats;

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data: page } = await client.query({
        query: LEGAL_DOCUMENT_STATS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: page.legalDocumentStatsTable.rows as LegalDocumentTypeCount[],
        total: page.legalDocumentStatsTable.total as number,
      };
    },
    [client]
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Legal Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          An overview of your legal documents by type.
        </Typography>
      </Box>

      {loading && !stats ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Card variant="outlined" sx={{ flex: '1 1 220px', minWidth: 220 }}>
              <CardActionArea onClick={() => navigate('/documents')}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <DescriptionIcon fontSize="large" color="primary" />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                        {stats?.total ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total documents
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Stack>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Documents by type
            </Typography>
            <DuncitTable<LegalDocumentTypeCount>
              tableId="legal-documents-by-type"
              columns={STATS_COLUMNS}
              fetchRows={fetchRows}
              getRowId={getStatsRowId}
              emptyText="No documents yet. Create one from the Documents section."
              defaultSort={{ field: 'count', dir: 'desc' }}
              searchPlaceholder="Search document type"
            />
          </Box>
        </>
      )}
    </Stack>
  );
}
