import { Avatar, Box, ButtonBase, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from '../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../theme';

interface ProfileIdentityProps {
  me: {
    profile_photo?: string | null;
    first_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  onClick: () => void;
}

const AVATAR = 52;

/** The profile header card — a round avatar, the name at 18/600 and the email
 * muted under it, with a chevron; the whole card opens the social profile. */
export default function ProfileIdentity({ me, onClick }: Readonly<ProfileIdentityProps>) {
  const { t } = useTranslation();
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <ButtonBase
        onClick={onClick}
        sx={{
          ...SURFACE_SX,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          textAlign: 'left',
          p: 2,
        }}
        aria-label={t('mweb.common.openYourProfile')}
      >
        <Avatar
          src={me?.profile_photo || undefined}
          sx={{
            width: AVATAR,
            height: AVATAR,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {initial}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>
            {me?.full_name ?? 'User'}
          </Typography>
          {me?.email && (
            <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary', display: 'block' }}>
              {me.email}
            </Typography>
          )}
        </Box>
        <ChevronRightIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
      </ButtonBase>
    </Box>
  );
}
