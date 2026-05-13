import {
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import MediaPickerField from '../../components/MediaPickerField';
import { STATUS_META, type EditForm } from './queries';

interface Props {
  user: any;
  form: EditForm;
  busy: boolean;
  onPhotoChange: (url: string) => void;
}

const empty = '—';

export default function UserSummaryCard({ user, form, busy, onPhotoChange }: Props) {
  const statusMeta = STATUS_META[form.status];
  const rows = [
    { label: 'Email', value: user.email ?? empty },
    { label: 'Phone', value: `${user.phone_extension || ''} ${user.phone_number || ''}`.trim() || empty },
    { label: 'City', value: user.city || empty },
    { label: 'Zone', value: user.zone || empty },
    { label: 'Assigned City', value: user.assigned_city || empty },
    { label: 'Assigned Zones', value: (user.assigned_zones ?? []).join(', ') || empty },
    { label: 'Created', value: user.created_at ? new Date(user.created_at).toLocaleString() : empty },
    { label: 'Updated', value: user.updated_at ? new Date(user.updated_at).toLocaleString() : empty },
  ];

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'center', sm: 'flex-start' }} spacing={2}>
          <Stack alignItems="center" spacing={1.25} sx={{ minWidth: 140 }}>
            <Avatar src={form.profile_photo || undefined} sx={{ width: 96, height: 96, fontSize: 36, bgcolor: 'primary.main' }}>
              {(form.first_name?.[0] ?? '?').toUpperCase()}
            </Avatar>
            <MediaPickerField
              label="Profile photo"
              value={form.profile_photo}
              onChange={onPhotoChange}
              folder="/users"
              buttonOnly
              buttonLabel={busy ? 'Updating...' : 'Update Photo'}
            />
          </Stack>
          <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Stack spacing={0.5}>
              <Typography variant="h6" noWrap>{form.first_name} {form.last_name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" label={statusMeta.label} color={statusMeta.color} />
                {user.is_email_verified && (
                  <Tooltip title="Email verified">
                    <Chip size="small" icon={<VerifiedIcon />} label="Verified" color="success" variant="outlined" />
                  </Tooltip>
                )}
              </Stack>
            </Stack>
            <Divider />
            <Table size="small" aria-label="user basic information">
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell sx={{ pl: 0, width: 150, color: 'text.secondary', borderBottomStyle: 'dashed' }}>
                      {row.label}
                    </TableCell>
                    <TableCell sx={{ pr: 0, borderBottomStyle: 'dashed', wordBreak: 'break-word' }}>
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
