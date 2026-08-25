import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from '../../../i18n/useTranslation';

interface ProfileIdentityProps {
  me: {
    profile_photo?: string | null;
    first_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  onClick: () => void;
}

/** Compact identity row — name + email on the left, avatar on the right,
 * the whole row opens the social profile. */
export default function ProfileIdentity({ me, onClick }: Readonly<ProfileIdentityProps>) {
  const { t } = useTranslation();
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();
  return (
    <Box sx={{ px: 2, py: 1 }}>
      <ButtonBase
        onClick={onClick}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          textAlign: 'left',
          px: 1.5,
          py: 1,
          borderRadius: '16px',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label={t('mweb.common.openYourProfile')}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.25} sx={{
            alignItems: "center"
          }}>
            <Typography
              noWrap
              sx={{
                fontSize: 15,
                fontWeight: 600
              }}>
              {me?.full_name ?? 'User'}
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 16 }} color="disabled" />
          </Stack>
          {me?.email && (
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                color: "text.secondary",
                display: "block"
              }}>
              {me.email}
            </Typography>
          )}
        </Box>
        <Avatar
          src={me?.profile_photo || undefined}
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'primary.main',
            fontSize: 18,
            fontWeight: 600,
            boxShadow: '0 0 0 2px rgba(255,79,115,0.18)',
          }}
        >
          {initial}
        </Avatar>
      </ButtonBase>
    </Box>
  );
}
