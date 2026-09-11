import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/EditOutlined';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import { DuncitButton } from '@duncit/buttons';
import ProfileAvatar from '../../components/profile-avatar';
import { useRoleLabels } from '../../hooks/useRoleLabels';
import { shareProfile } from '../../utils/share';

export interface AccountProfileHeaderProps {
  me: any;
  onEdit: () => void;
  onLogout: () => void;
  /** Refresh the page after the photo/story changes. */
  onChanged?: () => void;
}

const PILL_SX = { flex: 1, minHeight: 44, px: 1 } as const;
const SOFT_SX = { ...PILL_SX, bgcolor: 'action.hover' } as const;

export default function AccountProfileHeader({
  me,
  onEdit,
  onLogout,
  onChanged,
}: Readonly<AccountProfileHeaderProps>) {
  const { labelFor } = useRoleLabels();
  const name = me.full_name || `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim();

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <ProfileAvatar photo={me.profile_photo} name={name} size={88} onChanged={onChanged} />
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
          {me.full_name || `${me.first_name} ${me.last_name}`}
        </Typography>
        {me.bio && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {me.bio}
          </Typography>
        )}
        <Stack
          direction="row"
          useFlexGap
          spacing={0.75}
          sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75, justifyContent: 'center' }}
        >
          {me.roles?.map((r: string) => (
            <Chip key={r} label={labelFor(r)} size="small" sx={{ height: 26, fontSize: 11 }} />
          ))}
        </Stack>
      </Box>
      <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
        <DuncitButton color="inherit" startIcon={<EditIcon />} onClick={onEdit} sx={SOFT_SX}>
          Edit
        </DuncitButton>
        <DuncitButton
          color="inherit"
          startIcon={<ShareIcon />}
          onClick={() => shareProfile(me.user_id, name, me.username)}
          sx={SOFT_SX}
        >
          Share
        </DuncitButton>
        <DuncitButton
          color="error"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
          sx={{ ...PILL_SX, bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) }}
        >
          Logout
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
