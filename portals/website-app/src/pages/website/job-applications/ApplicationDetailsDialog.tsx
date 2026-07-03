import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_COLOR,
  type JobApplication,
  type JobApplicationStatus,
} from './queries';

interface Props {
  application: JobApplication | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: JobApplicationStatus) => void;
}

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

export default function ApplicationDetailsDialog({ application, onClose, onUpdateStatus }: Readonly<Props>) {
  if (!application) return null;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <span>{application.role_title}</span>
          <Chip
            size="small"
            label={application.status}
            color={JOB_APPLICATION_STATUS_COLOR[application.status]}
          />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Row label="Name" value={application.name} />
          <Row label="Email" value={<Link href={`mailto:${application.email}`}>{application.email}</Link>} />
          <Row
            label="Phone"
            value={application.phone ? <Link href={`tel:${application.phone}`}>{application.phone}</Link> : ''}
          />
          <Row
            label="Resume"
            value={
              application.resume_url ? (
                <Link href={application.resume_url} target="_blank" rel="noreferrer">
                  {application.resume_url}
                </Link>
              ) : (
                ''
              )
            }
          />
          <Row
            label="Portfolio"
            value={
              application.portfolio_url ? (
                <Link href={application.portfolio_url} target="_blank" rel="noreferrer">
                  {application.portfolio_url}
                </Link>
              ) : (
                ''
              )
            }
          />
          <Row label="Note" value={application.cover_note} />
          <TextField
            select
            size="small"
            label="Status"
            value={application.status}
            onChange={(e) => onUpdateStatus(application.id, e.target.value as JobApplicationStatus)}
            sx={{ maxWidth: 220, mt: 1 }}
          >
            {JOB_APPLICATION_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
