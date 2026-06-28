import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import ProfileAvatar from '../../components/profile-avatar';
import { useRoleLabels } from '../../hooks/useRoleLabels';

export interface AccountProfileHeaderProps {
  me: any;
  onEdit: () => void;
  onLogout: () => void;
  /** Refresh the page after the photo/story changes. */
  onChanged?: () => void;
}

export default function AccountProfileHeader({
  me,
  onEdit,
  onLogout,
  onChanged,
}: Readonly<AccountProfileHeaderProps>) {
  const { labelFor } = useRoleLabels();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
      <ProfileAvatar
        photo={me.profile_photo}
        name={me.full_name || `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim()}
        size={96}
        onChanged={onChanged}
      />
      <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
        <Typography variant="h5" fontWeight={700}>
          {me.full_name || `${me.first_name} ${me.last_name}`}
        </Typography>
        {me.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {me.bio}
          </Typography>
        )}
        <Stack
          direction="row"
          useFlexGap
          spacing={1}
          sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}
        >
          {me.roles?.map((r: string) => (
            <Chip key={r} label={labelFor(r)} size="small" color="primary" variant="outlined" />
          ))}
        </Stack>
      </Box>
      <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1}>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit}>
          Edit
        </Button>
        <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={onLogout}>
          Logout
        </Button>
      </Stack>
    </Stack>
  );
}
