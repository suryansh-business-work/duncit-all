import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useRoleLabels } from '../../hooks/useRoleLabels';

export interface AccountProfileHeaderProps {
  me: any;
  savingPhoto: boolean;
  onChangePhoto: () => void;
  onEdit: () => void;
  onLogout: () => void;
}

export default function AccountProfileHeader({
  me,
  savingPhoto,
  onChangePhoto,
  onEdit,
  onLogout,
}: Readonly<AccountProfileHeaderProps>) {
  const { labelFor } = useRoleLabels();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={me.profile_photo || undefined}
          sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36 }}
        >
          {(me.first_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Tooltip title="Change photo">
          <IconButton
            size="small"
            onClick={onChangePhoto}
            disabled={savingPhoto}
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {savingPhoto ? <CircularProgress size={16} /> : <PhotoCameraIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
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
          {me.status && <Chip label={me.status} size="small" />}
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
