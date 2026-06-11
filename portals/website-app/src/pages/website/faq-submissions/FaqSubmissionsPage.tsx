import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useDateFormat } from '../../../utils/dateFormat';
import { parseApiError } from '../../../utils/parseApiError';
import {
  FAQ_STATUS_COLOR,
  FAQ_STATUSES,
  FAQ_SUBMISSIONS,
  UPDATE_FAQ_SUBMISSION_STATUS,
  type FaqSubmission,
  type FaqSubmissionStatus,
} from './queries';

export default function FaqSubmissionsPage() {
  const [status, setStatus] = useState<FaqSubmissionStatus | ''>('');
  const { data, loading, error, refetch } = useQuery<{ faqSubmissions: FaqSubmission[] }>(
    FAQ_SUBMISSIONS,
    { variables: { status: status || null }, fetchPolicy: 'cache-and-network' },
  );
  const [updateStatus] = useMutation(UPDATE_FAQ_SUBMISSION_STATUS, { onCompleted: () => refetch() });
  const { formatDateTime } = useDateFormat();

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        FAQ Submission
      </Typography>
      <Card>
        <CardContent>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as FaqSubmissionStatus | '')}
            sx={{ minWidth: 200, mb: 2 }}
          >
            <MenuItem value="">All</MenuItem>
            {FAQ_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {error && <Typography color="error">{parseApiError(error)}</Typography>}
          {!loading && !error && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Question</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Super Cat.</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.faqSubmissions ?? []).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 360 }}>{r.question}</TableCell>
                    <TableCell>{r.email || '—'}</TableCell>
                    <TableCell>{r.super_category_slug || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} color={FAQ_STATUS_COLOR[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>{formatDateTime(r.created_at)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={r.status === 'CONVERTED'}
                          onClick={() => updateStatus({ variables: { id: r.id, status: 'CONVERTED' } })}
                        >
                          Mark Converted
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          disabled={r.status === 'IGNORED'}
                          onClick={() => updateStatus({ variables: { id: r.id, status: 'IGNORED' } })}
                        >
                          Ignore
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!(data?.faqSubmissions ?? []).length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No submissions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
