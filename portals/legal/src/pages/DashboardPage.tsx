import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import PolicyIcon from '@mui/icons-material/Policy';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import {
  LEGAL_DOCUMENT_STATS,
  LEGAL_DOCUMENT_STATS_TABLE,
  type LegalDocumentStats,
  type LegalDocumentTypeCount,
} from '../graphql/documents';
import { POLICY_STATS_TABLE, type PolicyTypeCount } from '../graphql/policies';
import { useTranslation } from '@duncit/shell';

// Aggregate rows are keyed by document_type (no id field on the server type).
const getStatsRowId = (r: LegalDocumentTypeCount) => r.document_type;

// Allowlists (LEGAL_DOCUMENT_STATS_TABLE_CONFIG): sort document_type/count;
// filter document_type (text) + count (number).
type Translate = ReturnType<typeof useTranslation>['t'];

/** Headings are copy, so the columns are built from the active catalogue. */
const statsColumns = (t: Translate): DuncitColumn<LegalDocumentTypeCount>[] => [
  { field: 'document_type', headerName: t('legal.dashboard.documentType'), flex: 1, minWidth: 220, filter: { type: 'text' } },
  { field: 'count', headerName: t('legal.dashboard.count'), width: 110, filter: { type: 'number' } },
];

// The policy aggregate has no id either — a row IS its type.
const getPolicyStatsRowId = (r: PolicyTypeCount) => r.policy_type;

// Same shape as the document columns, against POLICY_STATS_TABLE_CONFIG's
// allowlist: sort policy_type/count; filter policy_type (text) + count (number).
const policyStatsColumns = (t: Translate): DuncitColumn<PolicyTypeCount>[] => [
  { field: 'policy_type', headerName: t('legal.dashboard.policyType'), flex: 1, minWidth: 220, filter: { type: 'text' } },
  { field: 'count', headerName: t('legal.dashboard.totalPolicies'), width: 140, filter: { type: 'number' } },
];

type NavCardProps = Readonly<{
  icon: React.ReactNode;
  heading: React.ReactNode;
  caption: string;
  to: string;
}>;

/** One way-in tile: an icon beside a heading, the whole card clickable. */
function NavCard({ icon, heading, caption, to }: NavCardProps) {
  const navigate = useNavigate();
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea onClick={() => navigate(to)} sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {icon}
            <Box>{heading}</Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {caption}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { data } = useQuery<{ legalDocumentStats: LegalDocumentStats }>(LEGAL_DOCUMENT_STATS, {
    fetchPolicy: 'cache-and-network',
  });
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

  const widgets: DashboardWidget[] = [
    {
      id: 'documents-tile',
      bare: true,
      defaultLayout: { x: 0, y: 0, w: 6, h: 2 },
      minW: 3,
      minH: 2,
      content: (
        <NavCard
          to="/documents"
          icon={<DescriptionIcon fontSize="large" color="primary" />}
          caption={t('legal.dashboard.totalDocuments')}
          heading={
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
              {stats?.total ?? 0}
            </Typography>
          }
        />
      ),
    },
    {
      // Policies has no count to head with: this card is the way in to the
      // list, not a measure of it.
      id: 'policies-tile',
      bare: true,
      defaultLayout: { x: 6, y: 0, w: 6, h: 2 },
      minW: 3,
      minH: 2,
      content: (
        <NavCard
          to="/policies"
          icon={<PolicyIcon fontSize="large" color="primary" />}
          caption={t('legal.dashboard.policiesHint')}
          heading={
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Policies
            </Typography>
          }
        />
      ),
    },
    {
      id: 'documents-by-type',
      title: t('legal.dashboard.documentsByType'),
      disablePadding: true,
      // Toolbar + header + pagination alone are ~150px, so h6 always scrolled
      // internally even for a handful of rows.
      defaultLayout: { x: 0, y: 2, w: 12, h: 7 },
      minW: 4,
      minH: 4,
      content: (
        <DuncitTable<LegalDocumentTypeCount>
          tableId="legal-documents-by-type"
          columns={statsColumns(t)}
          fetchRows={fetchRows}
          getRowId={getStatsRowId}
          emptyText={t('legal.dashboard.emptyDocuments')}
          defaultSort={{ field: 'count', dir: 'desc' }}
          searchPlaceholder="Search document type"
        />
      ),
    },
    {
      // The same section, one module along. Counted from the policies
      // themselves, so creating, retyping or deleting one moves these numbers
      // on the next read.
      id: 'policies-by-type',
      title: t('legal.dashboard.policiesByType'),
      disablePadding: true,
      defaultLayout: { x: 0, y: 9, w: 12, h: 7 },
      minW: 4,
      minH: 4,
      content: (
        <DuncitTable<PolicyTypeCount>
          tableId="legal-policies-by-type"
          columns={policyStatsColumns(t)}
          fetchRows={fetchPolicyRows}
          getRowId={getPolicyStatsRowId}
          emptyText={t('legal.dashboard.emptyPolicies')}
          defaultSort={{ field: 'count', dir: 'desc' }}
          searchPlaceholder="Search policy type"
        />
      ),
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="legal.overview"
      header={
        <PageHeader
          title={t('legal.dashboard.title')}
          subtitle={t('legal.dashboard.subtitle')}
        />
      }
      widgets={widgets}
    />
  );
}
