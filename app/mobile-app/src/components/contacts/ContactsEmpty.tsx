import { Text } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import type { ContactsScope } from '@/hooks/useContacts';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  scope: ContactsScope;
  synced: boolean;
  searching: boolean;
  /** Nothing to show yet, but pages are still on their way. */
  loading: boolean;
  error?: unknown;
}

/** The sentence for an empty list, most specific reason first. */
function emptyText(
  t: (key: string) => string,
  scope: ContactsScope,
  synced: boolean,
  searching: boolean,
): string {
  if (!synced) return t('mweb.contacts.notSyncedYet');
  if (searching) return t('mweb.contacts.noMatchesForSearch');
  if (scope === 'nearby') return t('mweb.contacts.noneNearby');
  if (scope === 'invite') return t('mweb.contacts.everyoneIsHere');
  return t('mweb.contacts.noneMatched');
}

/** Why a list is empty — never synced, no search hit, nobody nearby, nobody
 * left to invite, nobody at all — or that it is still loading. Twin of mWeb's
 * `ContactsEmpty` (rule 27). */
export function ContactsEmpty({ scope, synced, searching, loading, error }: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading) return <ListSkeleton testID="contacts-list-loading" />;
  if (error) {
    return (
      <Text testID="contacts-list-error" padding={24} color="$danger">
        {toErrorMessage(error)}
      </Text>
    );
  }
  return (
    <Text
      testID="contacts-empty"
      textAlign="center"
      fontSize={14}
      color="$muted"
      paddingVertical={32}
      paddingHorizontal={24}
    >
      {emptyText(t, scope, synced, searching)}
    </Text>
  );
}
