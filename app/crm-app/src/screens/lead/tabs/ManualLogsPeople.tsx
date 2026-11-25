import { Text, XStack, YStack } from 'tamagui';

import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import type { StaffUser } from './ManualLogsState';
import { TabSheet } from './TabSheet';

/** Names for the user ids on the tab, and a way to open someone's details. */
export interface LogPeople {
  byId: ReadonlyMap<string, StaffUser>;
  onOpen: (userId: string) => void;
}

/** A user's name as a link that opens their details — never the raw user id. */
export function PersonName({ userId, people }: Readonly<{ userId: string; people: LogPeople }>) {
  const { t } = useTranslation();
  const name = people.byId.get(userId)?.name || t('crm.people.unknown');
  return (
    <Text
      role="link"
      aria-label={t('crm.people.openDetails', { vars: { name } })}
      onPress={() => people.onOpen(userId)}
      color="$accentText"
      fontWeight="700"
      fontSize="$2"
      testID={`person-${userId}`}
    >
      {name}
    </Text>
  );
}

/** Someone's details: name, and for current CRM staff their email and roles — the portal's user details dialog. */
export function PersonSheet({
  user,
  onClose,
}: Readonly<{ user: StaffUser | null; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <TabSheet
      open={Boolean(user)}
      title={user?.name || t('crm.people.unknown')}
      onClose={onClose}
      testID="person-sheet"
    >
      <YStack gap="$1">
        <Text color="$muted" fontSize="$2" fontWeight="700">
          {t('shell.common.email')}
        </Text>
        <Text selectable>{user?.email || t('crmApp.common.dash')}</Text>
      </YStack>
      <YStack gap="$1">
        <Text color="$muted" fontSize="$2" fontWeight="700">
          {t('crm.people.roles')}
        </Text>
        {user?.roles.length ? (
          <XStack gap="$1" flexWrap="wrap">
            {user.roles.map((role) => (
              <ToneChip key={role} label={role} tone="default" />
            ))}
          </XStack>
        ) : (
          <Text>{t('crmApp.common.dash')}</Text>
        )}
      </YStack>
      {user && !user.is_staff ? <Text color="$muted">{t('crm.people.notStaff')}</Text> : null}
    </TabSheet>
  );
}
