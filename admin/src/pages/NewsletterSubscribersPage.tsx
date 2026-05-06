import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
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

const SUBSCRIBERS = gql`
  query NewsletterSubscribers {
    newsletterSubscribers {
      id
      email
      source
      unsubscribed_at
      created_at
    }
  }
`;

interface Subscriber {
  id: string;
  email: string;
  source: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export default function NewsletterSubscribersPage() {
  const { data, loading, error } = useQuery<{ newsletterSubscribers: Subscriber[] }>(SUBSCRIBERS, {
    fetchPolicy: 'cache-and-network',
  });
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const list = data?.newsletterSubscribers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) => r.email.toLowerCase().includes(q) || r.source.toLowerCase().includes(q)
    );
  }, [data, search]);

  const active = rows.filter((r) => !r.unsubscribed_at).length;

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Newsletter
      </Typography>
      <Stack direction="row" spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Total</Typography>
            <Typography variant="h4">{data?.newsletterSubscribers?.length ?? 0}</Typography>
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
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search email or source"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
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
                    <TableCell>{r.unsubscribed_at ? 'Unsubscribed' : 'Active'}</TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
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
