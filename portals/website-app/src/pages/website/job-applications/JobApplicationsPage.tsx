import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useDateFormat } from '../../../utils/dateFormat';
import { parseApiError } from '../../../utils/parseApiError';
import ApplicationDetailsDialog from './ApplicationDetailsDialog';
import {
  JOB_APPLICATIONS,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_COLOR,
  UPDATE_JOB_APPLICATION_STATUS,
  type JobApplication,
  type JobApplicationStatus,
} from './queries';

/** Careers-page applications ("Open roles" submissions) — triage inbox. */
export default function JobApplicationsPage() {
  const [status, setStatus] = useState<JobApplicationStatus | ''>('');
  const { data, loading, error, refetch } = useQuery<{ jobApplications: JobApplication[] }>(
    JOB_APPLICATIONS,
    { variables: { status: status || null }, fetchPolicy: 'cache-and-network' },
  );
  const [updateStatus] = useMutation(UPDATE_JOB_APPLICATION_STATUS, { onCompleted: () => refetch() });
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState<JobApplication | null>(null);

  const rows = data?.jobApplications ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Job Applications
      </Typography>
      <Card>
        <CardContent>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as JobApplicationStatus | '')}
            sx={{ minWidth: 200, mb: 2 }}
          >
            <MenuItem value="">All</MenuItem>
            {JOB_APPLICATION_STATUSES.map((s) => (
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
                  <TableCell>Role</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.role_title}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} color={JOB_APPLICATION_STATUS_COLOR[r.status]} />
                    </TableCell>
                    <TableCell>{formatDateTime(r.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setOpen(r)} aria-label="view">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No applications.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ApplicationDetailsDialog
        application={open}
        onClose={() => setOpen(null)}
        onUpdateStatus={(id, s) => {
          updateStatus({ variables: { id, status: s } });
          setOpen(null);
        }}
      />
    </Stack>
  );
}
