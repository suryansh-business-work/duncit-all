import { Avatar, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { useTranslation } from '../../i18n/useTranslation';
import type { HostPageProfile } from './queries';

interface Props {
  host: HostPageProfile;
  name: string;
}

/** Who the host is: photo, name, @handle, city and bio (each only when set). */
export default function HostPageHeader({ host, name }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack data-testid="host-page-profile" spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Avatar
        data-testid="host-page-avatar"
        alt={t('publicPage.hostPage.avatarAlt', { vars: { name } })}
        src={host.profile_photo || undefined}
        sx={{ width: 88, height: 88, fontSize: 34, fontWeight: 600, bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="overline" component="p" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
        {t('publicPage.hostPage.eyebrow')}
      </Typography>
      <Typography data-testid="host-page-name" component="h2" variant="h5" sx={{ fontWeight: 600 }}>
        {name}
      </Typography>
      <Typography data-testid="host-page-username" variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        @{host.username}
      </Typography>
      {host.city && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <PlaceIcon aria-hidden fontSize="small" />
          <Typography data-testid="host-page-city" variant="body2">
            {host.city}
          </Typography>
        </Stack>
      )}
      {host.bio && (
        <Typography data-testid="host-page-bio" variant="body2" sx={{ px: 1, whiteSpace: 'pre-wrap' }}>
          {host.bio}
        </Typography>
      )}
    </Stack>
  );
}
