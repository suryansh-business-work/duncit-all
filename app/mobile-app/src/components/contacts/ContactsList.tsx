import { Spinner, Text, YStack } from 'tamagui';

import { ContactRow } from '@/components/contacts/ContactRow';
import { ListSkeleton } from '@/components/Skeleton';
import type { ContactRow as ContactRowData, ContactsScope } from '@/hooks/useContacts';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  rows: ContactRowData[];
  isLoading: boolean;
  error?: unknown;
  synced: boolean;
  scope: ContactsScope;
  searching: boolean;
  busyId: string | null;
  onToggleFollow: (row: ContactRowData) => void;
  onOpen: (userId: string) => void;
}

/** Loading / error / empty / list body under the radar — the empty copy says
 * WHY it is empty (never synced, nobody nearby, no search hit, nobody at all).
 * Twin of mWeb's `ContactsBody` (rule 27). */
export function ContactsList({
  rows,
  isLoading,
  error,
  synced,
  scope,
  searching,
  busyId,
  onToggleFollow,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (isLoading && rows.length === 0) return <ListSkeleton testID="contacts-list-loading" />;
  if (error) {
    return (
      <Text testID="contacts-list-error" padding={24} color="$danger">
        {toErrorMessage(error)}
      </Text>
    );
  }
  if (rows.length === 0) {
    let empty = t('mweb.contacts.noneMatched');
    if (!synced) empty = t('mweb.contacts.notSyncedYet');
    else if (searching) empty = t('mweb.contacts.noMatchesForSearch');
    else if (scope === 'nearby') empty = t('mweb.contacts.noneNearby');
    return (
      <Text
        testID="contacts-empty"
        textAlign="center"
        fontSize={13}
        color="$muted"
        paddingVertical={32}
        paddingHorizontal={24}
      >
        {empty}
      </Text>
    );
  }
  return (
    <YStack testID="contacts-list" gap={10} paddingHorizontal={16}>
      {/* A re-read of a list already on screen — after a follow, or a resync.
          The rows stay readable while it runs, exactly as they do on mWeb. */}
      {isLoading ? <Spinner testID="contacts-list-refreshing" color="$primary" /> : null}
      {rows.map((row) => (
        <ContactRow
          key={row.profile.user_id}
          row={row}
          busy={busyId === row.profile.user_id}
          onToggleFollow={() => onToggleFollow(row)}
          onOpen={() => onOpen(row.profile.user_id)}
        />
      ))}
    </YStack>
  );
}
