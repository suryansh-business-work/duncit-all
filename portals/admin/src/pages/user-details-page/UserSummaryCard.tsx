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
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface Props {
  user: any;
  form: EditForm;
  busy: boolean;
  onPhotoChange: (url: string) => void;
}

const empty = '—';

/** `+91 9876543210`, or the em dash when there is no number to show. */
const phoneLine = (extension?: string | null, number?: string | null) =>
  `${extension || ''} ${number || ''}`.trim() || empty;

export default function UserSummaryCard({ user, form, busy, onPhotoChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const statusMeta = STATUS_META[form.status];
  const rows = [
    { label: t('shell.common.email'), value: user.email ?? empty },
    { label: t('shell.common.phone'), value: phoneLine(user.phone_extension, user.phone_number) },
    {
      label: t('admin.profile.whatsappNumber'),
      value: phoneLine(user.whatsapp_extension, user.whatsapp_number),
    },
    { label: t('admin.profile.city'), value: user.city || empty },
    { label: t('admin.profile.zone'), value: user.zone || empty },
    { label: t('admin.profile.assignedCity'), value: user.assigned_city || empty },
    { label: t('admin.profile.assignedZones'), value: (user.assigned_zones ?? []).join(', ') || empty },
    { label: t('shell.common.created'), value: user.created_at ? formatDateTime(user.created_at) : empty },
    { label: t('shell.common.updated'), value: user.updated_at ? formatDateTime(user.updated_at) : empty },
  ];

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
          alignItems: { xs: 'center', sm: 'flex-start' }
        }}>
          <Stack
            spacing={1.25}
            sx={{
              alignItems: "center",
              minWidth: 140
            }}>
            <Avatar src={form.profile_photo || undefined} sx={{ width: 96, height: 96, fontSize: 36, bgcolor: 'primary.main' }}>
              {(form.first_name?.[0] ?? '?').toUpperCase()}
            </Avatar>
            <MediaPickerField
              label={t('admin.profile.photo')}
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
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap"
                }}>
                <Chip size="small" label={statusMeta.label} color={statusMeta.color} />
                {user.is_email_verified && (
                  <Tooltip title={t('admin.profile.emailVerified')}>
                    <Chip size="small" icon={<VerifiedIcon />} label={t('admin.profile.verified')} color="success" variant="outlined" />
                  </Tooltip>
                )}
              </Stack>
            </Stack>
            <Divider />
            <Table size="small" aria-label={t('admin.profile.basicInfo')}>
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
