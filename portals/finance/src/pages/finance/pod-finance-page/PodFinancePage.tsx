import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { parseApiError } from '../../../utils/parseApiError';
import {
  POD_FINANCE_RELEASES,
  groupReleasesByPod,
  money,
  type PodFinanceGroup,
  type PodReleaseRow,
} from './queries';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

function StatusCountChips({ counts }: Readonly<{ counts: Record<string, number> }>) {
  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
      {Object.entries(counts).map(([status, count]) => (
        <Chip key={status} size="small" label={`${count} ${status}`} color={STATUS_COLORS[status] ?? 'default'} />
      ))}
    </Stack>
  );
}

interface QueryData {
  paymentReleaseRequests: PodReleaseRow[];
  publicFinanceSettings: { currency_symbol: string };
}

export default function PodFinancePage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<QueryData>(POD_FINANCE_RELEASES, {
    fetchPolicy: 'cache-and-network',
  });

  const sym = data?.publicFinanceSettings?.currency_symbol ?? '';
  const groups: PodFinanceGroup[] = groupReleasesByPod(data?.paymentReleaseRequests ?? []);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <AnalyticsIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Pod Finance</Typography>
          <Typography variant="body2" color="text.secondary">
            Pods with money movement — open a pod to see its full financial waterfall.
          </Typography>
        </Box>
      </Stack>
      <Card variant="outlined">
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{parseApiError(error)}</Alert>}
          {loading && groups.length === 0 ? (
            <Stack alignItems="center" sx={{ p: 4 }}><CircularProgress /></Stack>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Pod</TableCell>
                    <TableCell>Releases</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell>Release statuses</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow
                      key={group.pod_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/pod-finance/${group.pod_id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{group.pod_title}</Typography>
                      </TableCell>
                      <TableCell>{group.releases_count}</TableCell>
                      <TableCell>{money(sym, group.requested_total)}</TableCell>
                      <TableCell><StatusCountChips counts={group.status_counts} /></TableCell>
                    </TableRow>
                  ))}
                  {groups.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                          No pods with payment activity yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
