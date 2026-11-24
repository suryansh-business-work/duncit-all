import { Chip, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { SocialAccount } from '../queries';

/** A token this close to lapsing is worth a chip; the server emails the owner at the same point. */
export const EXPIRY_WARNING_DAYS = 7;

/**
 * A warning once the token has a week or less to live, red once it has
 * lapsed; nothing for a token that does not expire or is not close.
 */
export function ExpiryChip({ days }: Readonly<{ days: number | null }>) {
  const { t } = useTranslation();
  if (days === null || days > EXPIRY_WARNING_DAYS) return null;
  const lapsed = days <= 0;
  return (
    <Chip
      size="small"
      color={lapsed ? 'error' : 'warning'}
      label={lapsed ? t('marketing.social.tokenExpired') : t('marketing.social.expiresIn', { count: days })}
      data-testid="social-expiry-chip"
    />
  );
}

/** When the daily check last ran, and what the network said when it was not happy. */
export function HealthLine({ account }: Readonly<{ account: SocialAccount }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  if (!account.health_checked_at) return null;
  const complaint = account.health_ok === false ? account.health_message : '';
  const checked = t('marketing.social.healthChecked', { vars: { when: formatDateTime(account.health_checked_at) } });
  return (
    <Typography
      variant="caption"
      component="p"
      sx={{ color: complaint ? 'error.main' : 'text.secondary' }}
      data-testid="social-health-line"
    >
      {[checked, complaint].filter(Boolean).join(' · ')}
    </Typography>
  );
}

/**
 * Whether the account can do direct messages: the permission a reconnect would
 * grant, and why the last DM read or the Page's webhook subscription failed.
 * Nothing at all for an account that is ready (or a network without DMs here).
 */
export function MessagingLine({ account }: Readonly<{ account: SocialAccount }>) {
  const { t } = useTranslation();
  const lines = [
    account.messaging_missing_permission ? t('marketing.social.messagingMissing', { vars: { permission: account.messaging_missing_permission } }) : '',
    account.webhook_error ? t('marketing.social.webhookError', { vars: { reason: account.webhook_error } }) : '',
    account.dm_error ? t('marketing.social.dmError', { vars: { reason: account.dm_error } }) : '',
  ].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <Typography variant="caption" component="p" sx={{ color: 'warning.main' }} data-testid="social-messaging-line">
      {lines.join(' · ')}
    </Typography>
  );
}
