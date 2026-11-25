import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_DASH } from '@duncit/utils';

import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { EmailStatusBadge } from '../contacts/EmailStatusBadge';
import { useEmailStatuses } from '../contacts/useEmailStatuses';
import type { MatchedUser } from './overviewTypes';

/** Where an account can use Duncit from, in the order the server answers it (UserPlatform). */
const PLATFORMS = [
  { key: 'ANDROID', icon: 'android', labelKey: 'ui.platforms.android' },
  { key: 'IOS', icon: 'apple', labelKey: 'ui.platforms.ios' },
  { key: 'WEB', icon: 'web', labelKey: 'ui.platforms.web' },
] as const;

/** "Also a Duncit user · Email match" — beside the lead's chips and in the box below. */
export function MatchedUserChip({ matched }: Readonly<{ matched: MatchedUser }>) {
  const { t } = useTranslation();
  const via = matched.matched_on === 'EMAIL' ? t('shell.common.email') : t('shell.common.phone');
  return (
    <ToneChip
      label={t('crm.leadDetail.alsoDuncitUser', { vars: { via } })}
      tone="success"
      testID="matched-user-chip"
    />
  );
}

/** Android, iOS and the web as icons: the platforms this account used in ink, the rest dimmed. */
function PlatformIcons({ used }: Readonly<{ used: readonly string[] }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack gap="$2" role="list" aria-label={t('ui.platforms.label')}>
      {PLATFORMS.map((platform) => {
        const isUsed = used.includes(platform.key);
        const usage = isUsed ? 'used' : 'unused';
        const name = t(platform.labelKey);
        const label = isUsed
          ? t('ui.platforms.used', { vars: { platform: name } })
          : t('ui.platforms.notUsed', { vars: { platform: name } });
        return (
          <MaterialCommunityIcons
            key={platform.key}
            name={platform.icon}
            size={18}
            color={isUsed ? theme.color?.val : theme.borderColor?.val}
            accessibilityLabel={label}
            testID={`matched-platform-${platform.key}-${usage}`}
          />
        );
      })}
    </XStack>
  );
}

/** The portal's "Also a Duncit user" box: who the account is, its contact, its devices and last activity. */
export function MatchedUserCard({ matched }: Readonly<{ matched: MatchedUser }>) {
  const { t } = useTranslation();
  const statuses = useEmailStatuses(matched.email ? [matched.email] : []);
  const contact = [matched.email, matched.phone].filter(Boolean).join(' · ') || CRM_DASH;
  return (
    <YStack
      gap="$2"
      padding="$3"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$success"
      backgroundColor="$surface"
      testID="matched-user-box"
    >
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text fontWeight="800">{matched.full_name || t('crm.leadDetail.duncitUser')}</Text>
        <MatchedUserChip matched={matched} />
      </XStack>
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text color="$muted" fontSize="$2">
          {contact}
        </Text>
        {matched.email ? <EmailStatusBadge email={matched.email} statuses={statuses} /> : null}
      </XStack>
      <XStack alignItems="center" gap="$2">
        <Text color="$muted" fontSize="$2">
          {t('crm.matchedUser.devices')}
        </Text>
        <PlatformIcons used={matched.platforms_used} />
      </XStack>
      <Text fontSize="$2" testID="matched-user-last-activity">
        <Text color="$muted">{`${t('crm.matchedUser.lastActivity')}: `}</Text>
        {matched.last_activity_at
          ? displayDateTime(matched.last_activity_at)
          : t('crm.matchedUser.noActivity')}
      </Text>
    </YStack>
  );
}
