import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import type { ContactsSyncStatus } from '@/hooks/useContacts';
import type { ContactsSyncFailure } from '@/hooks/useContactsSync';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

interface Props {
  status: ContactsSyncStatus | null;
  busy: boolean;
  failure: ContactsSyncFailure | null;
  onAllow: () => void;
}

/**
 * The "allow" card: what syncing does, the button that does it, and what the
 * last sync found. Twin of mWeb's `ContactsAllowCard` (rule 27).
 */
export function ContactsAllowCard({ status, busy, failure, onAllow }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  let failureText = '';
  if (failure === 'DENIED') failureText = t('mweb.contacts.permissionDenied');
  else if (failure === 'FAILED') failureText = t('mweb.contacts.syncFailed');
  let summary = t('mweb.contacts.notSyncedYet');
  if (status) {
    summary = `${t('mweb.contacts.matched', { count: status.matched })} · ${t(
      'mweb.contacts.lastSynced',
      {
        vars: { when: formatDateTime(status.synced_at) },
      },
    )}`;
  }

  return (
    <YStack
      testID="contacts-allow-card"
      marginHorizontal={16}
      padding={16}
      gap={10}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="contact-phone" size={22} color={primary} />
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('mweb.contacts.allowTitle')}
        </Text>
      </XStack>
      <Text fontSize={13} color="$muted">
        {t('mweb.contacts.allowBody')}
      </Text>
      <Text testID="contacts-sync-summary" fontSize={13} color="$color">
        {summary}
      </Text>
      {status && status.invitable > 0 ? (
        <Text testID="contacts-invite-summary" fontSize={13} color="$muted">
          {t('mweb.contacts.toInvite', { count: status.invitable })}
        </Text>
      ) : null}
      <XStack>
        <DuncitButton
          testID="contacts-allow-button"
          label={status ? t('mweb.contacts.resync') : t('mweb.contacts.allowButton')}
          onPress={onAllow}
          loading={busy}
        />
      </XStack>
      {failureText ? (
        <Text testID="contacts-sync-error" fontSize={13} color="$danger">
          {failureText}
        </Text>
      ) : null}
    </YStack>
  );
}
