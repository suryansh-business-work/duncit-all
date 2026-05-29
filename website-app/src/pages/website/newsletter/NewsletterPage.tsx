import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
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
  TextField,
  Typography,
} from '@mui/material';
import { useDateFormat } from '../../../utils/dateFormat';
import { parseApiError } from '../../../utils/parseApiError';
import { NEWSLETTER_SUBSCRIBERS, type Subscriber } from './queries';

export default function NewsletterPage() {
  const { data, loading, error } = useQuery<{ newsletterSubscribers: Subscriber[] }>(
    NEWSLETTER_SUBSCRIBERS,
    { fetchPolicy: 'cache-and-network' },
  );
  const { formatDateTime } = useDateFormat();
  const [search, setSearch] = useState('');

  const all = data?.newsletterSubscribers ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) => r.email.toLowerCase().includes(q) || r.source.toLowerCase().includes(q),
    );
  }, [all, search]);

  const active = all.filter((r) => !r.unsubscribed_at).length;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Newsletter Submission
      </Typography>
      <Stack direction="row" spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Total</Typography>
            <Typography variant="h4">{all.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Active</Typography>
            <Typography variant="h4">{active}</Typography>
          </CardContent>
        </Card>
      </Stack>
      <Card>
        <CardContent>
          <TextField
            size="small"
            placeholder="Search email or source"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
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
                  <TableCell>Email</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Subscribed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.source}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.unsubscribed_at ? 'Unsubscribed' : 'Active'}
                        color={r.unsubscribed_at ? 'default' : 'success'}
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(r.created_at)}</TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No subscribers yet.
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
