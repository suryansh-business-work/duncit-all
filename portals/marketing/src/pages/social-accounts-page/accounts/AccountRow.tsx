import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SyncIcon from '@mui/icons-material/Sync';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { STATUS_COLORS, STATUS_LABEL } from '../copy';
import type { SocialAccount } from '../queries';

interface Props {
  account: SocialAccount;
  onSync: (account: SocialAccount) => Promise<void>;
  onReconnect: () => Promise<void>;
  onDisconnect: (account: SocialAccount) => void;
}

/** One connected Page, channel or profile: who it is, how it is doing, and what can be done to it. */
export default function AccountRow({ account, onSync, onReconnect, onDisconnect }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const expired = account.status === 'EXPIRED';
  const synced = account.last_synced_at
    ? t('marketing.social.lastSynced', { vars: { when: formatDateTime(account.last_synced_at) } })
    : t('marketing.social.notSyncedYet');
  const facts = [
    account.handle,
    `${t('marketing.social.followers')}: ${account.followers.toLocaleString(locale)}`,
    synced,
  ].filter(Boolean);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ py: 1.5, alignItems: { sm: 'center' } }}
      data-testid={`social-account-${account.id}`}
    >
      <Avatar src={account.avatar_url || undefined} alt="" sx={{ width: 40, height: 40 }}>
        <PlatformIcon platform={account.platform} fontSize="small" />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <PlatformIcon platform={account.platform} fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
            {account.name}
          </Typography>
          <StatusChip status={account.status} colorMap={STATUS_COLORS} label={t(STATUS_LABEL[account.status])} />
          {account.flagged_open > 0 && (
            <Chip size="small" color="error" variant="outlined" label={t('marketing.social.toReview', { count: account.flagged_open })} />
          )}
        </Stack>
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {facts.join(' · ')}
        </Typography>
        {account.status !== 'CONNECTED' && account.last_error && (
          <Typography variant="caption" component="p" sx={{ color: 'error.main' }} role="status">
            {account.last_error}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
        {expired ? (
          <DuncitButton size="small" variant="contained" onClick={onReconnect} data-testid={`social-reconnect-${account.id}`}>
            {t('marketing.social.reconnect')}
          </DuncitButton>
        ) : (
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={() => onSync(account)}
            data-testid={`social-sync-${account.id}`}
          >
            {t('marketing.social.syncNow')}
          </DuncitButton>
        )}
        {/* The tooltip IS the accessible name (MUI writes it onto the child), so it names the account. */}
        {account.profile_url && (
          <Tooltip title={t('marketing.social.openProfileOf', { vars: { name: account.name } })}>
            <DuncitIconButton
              size="small"
              component="a"
              href={account.profile_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <OpenInNewIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        )}
        <Tooltip title={t('marketing.social.disconnectOf', { vars: { name: account.name } })}>
          <DuncitIconButton
            size="small"
            onClick={() => onDisconnect(account)}
            data-testid={`social-disconnect-${account.id}`}
          >
            <LinkOffIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
