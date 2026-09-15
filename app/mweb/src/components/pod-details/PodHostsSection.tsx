import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

interface Host {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
  passport_photo_url?: string | null;
}

interface Props {
  hosts: Host[];
}

/** One tappable row per host — photo, name, "Host" — opening their profile.
 * Native twin: HostsSection in components/details/PodSections. */
export default function PodHostsSection({ hosts }: Readonly<Props>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  if (!hosts || hosts.length === 0) {
    return (
      <Typography data-testid="pod-hosts-empty" variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.podDetails.hostsEmpty')}
      </Typography>
    );
  }
  return (
    <Stack data-testid="pod-hosts-section" spacing={0.5}>
      {hosts.map((h) => (
        <ButtonBase
          key={h.user_id}
          data-testid={`host-row-${h.user_id}`}
          onClick={() => navigate(`/u/${h.user_id}`)}
          sx={{
            width: '100%',
            justifyContent: 'flex-start',
            textAlign: 'left',
            gap: 1.5,
            py: 0.75,
            borderRadius: '14px',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            src={h.profile_photo || h.passport_photo_url || undefined}
            alt=""
            sx={{ width: 40, height: 40, bgcolor: 'action.hover', color: 'text.primary' }}
          >
            {h.full_name?.[0]?.toUpperCase() ?? 'H'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {h.full_name || t('mweb.podDetails.host')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('mweb.podDetails.host')}
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        </ButtonBase>
      ))}
    </Stack>
  );
}
