import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ContactDetailsDialog from '../contact-submissions-page/ContactDetailsDialog';
import {
  SUBMISSIONS,
  STATUSES,
  TAG_RE,
  UPDATE_STATUS,
  type Submission,
} from './queries';
import SupportLogsTable from './SupportLogsTable';

export default function SupportLogsPage() {
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const { data, loading, error, refetch } = useQuery<{ contactSubmissions: Submission[] }>(
    SUBMISSIONS,
    { variables: { status: status || null }, fetchPolicy: 'cache-and-network' }
  );
  const [updateStatus] = useMutation(UPDATE_STATUS, { onCompleted: () => refetch() });
  const [open, setOpen] = useState<Submission | null>(null);

  const all = data?.contactSubmissions ?? [];
  const supportItems = useMemo(() => all.filter((s) => TAG_RE.test(s.subject)), [all]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    supportItems.forEach((s) => {
      const m = s.subject.match(TAG_RE);
      if (m) set.add(m[1]);
    });
    return Array.from(set).sort();
  }, [supportItems]);

  const filtered = useMemo(() => {
    if (!category) return supportItems;
    return supportItems.filter((s) => s.subject.startsWith(`[${category}]`));
  }, [supportItems, category]);

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <SupportAgentIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          Support Logs
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s || 'all'} value={s}>
                  {s || 'All'}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {error && <Alert severity="error">{error.message}</Alert>}

          <SupportLogsTable
            loading={loading}
            hasData={!!data}
            rows={filtered}
            onView={setOpen}
          />
        </CardContent>
      </Card>

      {open && (
        <ContactDetailsDialog
          submission={open}
          onClose={() => setOpen(null)}
          onUpdateStatus={(id, next) => updateStatus({ variables: { id, status: next } })}
        />
      )}
    </Stack>
  );
}
