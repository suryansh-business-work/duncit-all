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
import PolicyIcon from '@mui/icons-material/Policy';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import {
  LEGAL_DOCUMENT_STATS,
  LEGAL_DOCUMENT_STATS_TABLE,
  type LegalDocumentStats,
  type LegalDocumentTypeCount,
} from '../graphql/documents';
import { POLICY_STATS_TABLE, type PolicyTypeCount } from '../graphql/policies';

// Aggregate rows are keyed by document_type (no id field on the server type).
const getStatsRowId = (r: LegalDocumentTypeCount) => r.document_type;

/** One shape for every dashboard card, so a new one cannot drift from the rest. */
const CARD_SX = { flex: '1 1 220px', minWidth: 220 } as const;

// Allowlists (LEGAL_DOCUMENT_STATS_TABLE_CONFIG): sort document_type/count;
// filter document_type (text) + count (number).
const STATS_COLUMNS: DuncitColumn<LegalDocumentTypeCount>[] = [
  { field: 'document_type', headerName: 'Document type', flex: 1, minWidth: 220, filter: { type: 'text' } },
  { field: 'count', headerName: 'Count', width: 110, filter: { type: 'number' } },
];

// The policy aggregate has no id either — a row IS its type.
const getPolicyStatsRowId = (r: PolicyTypeCount) => r.policy_type;

// Same shape as the document columns, against POLICY_STATS_TABLE_CONFIG's
// allowlist: sort policy_type/count; filter policy_type (text) + count (number).
const POLICY_STATS_COLUMNS: DuncitColumn<PolicyTypeCount>[] = [
  { field: 'policy_type', headerName: 'Policy type', flex: 1, minWidth: 220, filter: { type: 'text' } },
  { field: 'count', headerName: 'Total policies', width: 140, filter: { type: 'number' } },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading } = useQuery<{ legalDocumentStats: LegalDocumentStats }>(
    LEGAL_DOCUMENT_STATS,
    { fetchPolicy: 'cache-and-network' }
  );
  const stats = data?.legalDocumentStats;

  const fetchRows = useApolloTableFetch<LegalDocumentTypeCount>(
    client,
    LEGAL_DOCUMENT_STATS_TABLE,
    'legalDocumentStatsTable',
  );

  const fetchPolicyRows = useApolloTableFetch<PolicyTypeCount>(
    client,
    POLICY_STATS_TABLE,
    'policyStatsTable',
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Legal Dashboard"
        subtitle="An overview of your legal documents and policies by type."
      />

      {loading && !stats ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Card variant="outlined" sx={CARD_SX}>
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

            {/* Same shell as Documents — outlined card, action area, icon beside
                the text, and the same flex basis so the two wrap together on a
                narrow screen. Policies has no count to head with: this card is
                the way in to the list, not a measure of it. */}
            <Card variant="outlined" sx={CARD_SX}>
              <CardActionArea onClick={() => navigate('/policies')}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PolicyIcon fontSize="large" color="primary" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        Policies
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        View, manage, and publish platform policies.
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

          {/* The same section, one module along. Counted from the policies
              themselves, so creating, retyping or deleting one moves these
              numbers on the next read — and a type nobody has used does not
              appear, exactly as an unused document type does not. */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Policies by type
            </Typography>
            <DuncitTable<PolicyTypeCount>
              tableId="legal-policies-by-type"
              columns={POLICY_STATS_COLUMNS}
              fetchRows={fetchPolicyRows}
              getRowId={getPolicyStatsRowId}
              emptyText="No policies yet. Create one from the Policies section."
              defaultSort={{ field: 'count', dir: 'desc' }}
              searchPlaceholder="Search policy type"
            />
          </Box>
        </>
      )}
    </Stack>
  );
}
