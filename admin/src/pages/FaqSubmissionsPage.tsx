import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
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

const SUBMISSIONS = gql`
  query FaqSubmissions($status: FaqSubmissionStatus) {
    faqSubmissions(status: $status) {
      id
      question
      email
      super_category_slug
      status
      created_at
    }
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateFaqSubmissionStatus($id: ID!, $status: FaqSubmissionStatus!) {
    updateFaqSubmissionStatus(faq_submission_id: $id, status: $status) {
      id
      status
    }
  }
`;

const STATUSES = ['', 'NEW', 'CONVERTED', 'IGNORED'] as const;

const COLOR: Record<string, 'default' | 'primary' | 'success'> = {
  NEW: 'primary',
  CONVERTED: 'success',
  IGNORED: 'default',
};

interface Submission {
  id: string;
  question: string;
  email: string | null;
  super_category_slug: string | null;
  status: string;
  created_at: string;
}

export default function FaqSubmissionsPage() {
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useQuery<{ faqSubmissions: Submission[] }>(SUBMISSIONS, {
    variables: { status: status || null },
    fetchPolicy: 'cache-and-network',
  });
  const [updateStatus] = useMutation(UPDATE_STATUS, { onCompleted: () => refetch() });

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        FAQ Submissions
      </Typography>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s || 'all'} value={s}>
                  {s || 'All'}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {error && <Typography color="error">{error.message}</Typography>}
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
                      <Chip size="small" label={r.status} color={COLOR[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={r.status === 'CONVERTED'}
                          onClick={() =>
                            updateStatus({ variables: { id: r.id, status: 'CONVERTED' } })
                          }
                        >
                          Mark Converted
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          disabled={r.status === 'IGNORED'}
                          onClick={() =>
                            updateStatus({ variables: { id: r.id, status: 'IGNORED' } })
                          }
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
