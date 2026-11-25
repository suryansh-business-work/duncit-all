import { Text } from 'tamagui';

import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';

/** The platforms in the portal's display order (Android, iOS, Web). */
const PLATFORM_KEYS: { value: string; key: string }[] = [
  { value: 'ANDROID', key: 'ui.platforms.android' },
  { value: 'IOS', key: 'ui.platforms.ios' },
  { value: 'WEB', key: 'ui.platforms.web' },
];

interface Props {
  matched: { platforms_used: string[]; last_activity_at?: string | null } | null;
}

/**
 * Devices and Last activity of the Duncit account a lead's contact belongs to
 * — the portal's two matched-user columns — or "Not on Duncit".
 */
export function LeadListRowMatched({ matched }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!matched) {
    return (
      <Text color="$muted" fontSize="$2">
        {`${t('crm.matchedUser.devices')}: ${t('crm.matchedUser.notOnDuncit')}`}
      </Text>
    );
  }
  const used = new Set(matched.platforms_used);
  const devices = PLATFORM_KEYS.filter((p) => used.has(p.value))
    .map((p) => t(p.key))
    .join(', ');
  const activity = matched.last_activity_at
    ? displayDateTime(matched.last_activity_at)
    : t('crm.matchedUser.noActivity');
  return (
    <Text color="$muted" fontSize="$2">
      {`${t('crm.matchedUser.devices')}: ${devices || t('crmApp.common.dash')} · ${t('crm.matchedUser.lastActivity')}: ${activity}`}
    </Text>
  );
}
