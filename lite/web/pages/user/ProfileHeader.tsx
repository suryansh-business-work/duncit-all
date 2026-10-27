import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import type { LiteMe } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { UserAvatar } from '../../components/UserAvatar';
import { paragraphs } from '../../lib/text';
import { SocialLinks } from './SocialLinks';

function Stat({ value, label, testId }: Readonly<{ value: number; label: string; testId: string }>) {
  return (
    <Typography color="text.secondary" data-testid={testId}>
      <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
        {value}
      </Box>{' '}
      {label}
    </Typography>
  );
}

/** Picture, name, handle, when they joined, how many events they hosted and went to, links and bio. */
export function ProfileHeader({ user }: Readonly<{ user: LiteMe }>) {
  const { t } = useWebT();
  const { formatDate } = useDateFormat();
  return (
    <Stack spacing={2} data-testid="user-header">
      <UserAvatar name={user.name} url={user.avatar_url} size={96} />
      <Stack spacing={0.5}>
        <Typography variant="h2" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          {user.name}
        </Typography>
        <Typography color="text.secondary">
          @{user.handle}
          {user.created_at ? ` · ${t('liteWeb.user.joined', { vars: { date: formatDate(user.created_at) } })}` : ''}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={3}>
        <Stat value={user.events_hosted} label={t('liteWeb.user.hostedLabel')} testId="user-hosted" />
        <Stat value={user.events_attended} label={t('liteWeb.user.attendedLabel')} testId="user-attended" />
      </Stack>
      <SocialLinks name={user.name} social={user.social} />
      {user.bio
        ? paragraphs(user.bio).map((block) => (
            <Typography key={block.slice(0, 40)} sx={{ maxWidth: 640 }}>
              {block}
            </Typography>
          ))
        : null}
    </Stack>
  );
}
