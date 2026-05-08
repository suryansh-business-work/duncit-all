import {
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedIcon from '@mui/icons-material/Verified';
import { STATUS_META, type EditForm } from './queries';

interface Props {
  user: any;
  form: EditForm;
}

export default function UserSummaryCard({ user, form }: Props) {
  const statusMeta = STATUS_META[form.status];
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack alignItems="center" spacing={1.5}>
          <Avatar
            src={form.profile_photo || undefined}
            sx={{ width: 96, height: 96, fontSize: 36, bgcolor: 'primary.main' }}
          >
            {(form.first_name?.[0] ?? '?').toUpperCase()}
          </Avatar>
          <Typography variant="h6">
            {form.first_name} {form.last_name}
          </Typography>
          <Chip size="small" label={statusMeta.label} color={statusMeta.color} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <EmailIcon fontSize="small" color="action" />
            <Typography variant="body2">{user.email ?? '—'}</Typography>
            {user.is_email_verified && (
              <Tooltip title="Verified">
                <VerifiedIcon fontSize="inherit" color="success" />
              </Tooltip>
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <PhoneIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {user.phone_extension} {user.phone_number}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Created {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
