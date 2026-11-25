import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';
import { CrmTelephony, type DirectoryContact } from 'crm-telephony';

import { LeadAvatar } from '@/components/LeadAvatar';
import { StateView } from '@/components/StateView';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

const LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 250;

function Row({
  contact,
  onPick,
}: Readonly<{ contact: DirectoryContact; onPick: (n: string) => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const kind = t(`crmApp.kind.${contact.entityType}`);
  return (
    <XStack
      role="button"
      aria-label={[contact.leadName, contact.contactName, kind].filter(Boolean).join(', ')}
      onPress={() => onPick(contact.phoneKey)}
      alignItems="center"
      gap="$3"
      padding="$3"
      backgroundColor="$surface"
      borderRadius={RADII.lg}
      borderWidth={1}
      borderColor="$borderColor"
      testID={`contact-${contact.leadId}-${contact.phoneKey}`}
    >
      <LeadAvatar name={contact.leadName} size={44} />
      <YStack flex={1}>
        <Text fontWeight="700" numberOfLines={1}>
          {contact.leadName}
        </Text>
        <Text color="$muted" fontSize="$2" numberOfLines={1}>
          {[contact.contactName, kind, contact.city].filter(Boolean).join(' · ')}
        </Text>
      </YStack>
      <MaterialIcons name="call" size={22} color={theme.accentText?.val} />
    </XStack>
  );
}

/**
 * The Contacts tab: every CRM contact with a phone number, from the offline
 * caller-ID directory — all lead kinds, searchable by name or digits, with no
 * network. Tapping one puts the number on the dial pad.
 */
export function CrmContacts({ onPick }: Readonly<{ onPick: (number: string) => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<DirectoryContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      (CrmTelephony?.searchDirectory(query, LIMIT) ?? Promise.resolve([]))
        .then((rows) => {
          if (!live) return;
          setContacts(rows);
          setError(null);
        })
        .catch(() => {
          if (live) setError(t('crmApp.common.loadFailed'));
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, t]);

  return (
    <YStack flex={1}>
      <XStack
        alignItems="center"
        gap="$2"
        margin="$4"
        marginBottom="$0"
        paddingHorizontal="$3"
        backgroundColor="$surface"
        borderRadius={RADII.lg}
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name="search" size={22} color={theme.muted?.val} />
        <Input
          flex={1}
          value={query}
          onChangeText={setQuery}
          placeholder={t('crmApp.dialer.searchContacts')}
          aria-label={t('crmApp.dialer.searchContacts')}
          placeholderTextColor="$muted"
          borderWidth={0}
          backgroundColor="transparent"
          testID="contacts-search"
        />
      </XStack>
      <FlatList
        data={contacts ?? []}
        keyExtractor={(c) => `${c.leadId}-${c.phoneKey}`}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <Row contact={item} onPick={onPick} />}
        ListEmptyComponent={
          <StateView
            loading={contacts === null && !error}
            error={error}
            empty={t(query ? 'crmApp.dialer.contactsNoMatch' : 'crmApp.dialer.contactsEmpty')}
          />
        }
      />
    </YStack>
  );
}
