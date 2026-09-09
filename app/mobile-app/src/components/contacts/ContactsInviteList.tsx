import { Text, XStack, YStack } from 'tamagui';
import {
  inviteOutcomeKey,
  pendingInviteKeys,
  type InvitableContact,
  type InviteOutcome,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { InviteRow } from '@/components/contacts/InviteRow';
import { ListSkeleton } from '@/components/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  rows: InvitableContact[];
  isLoading: boolean;
  error?: unknown;
  synced: boolean;
  searching: boolean;
  selected: string[];
  /** What the last press did — the app has no toast, so it is said in place. */
  result: (InviteOutcome & { skipped: number }) | null;
  busyKey: string | null;
  bulkBusy: boolean;
  onToggleSelect: (key: string) => void;
  onInvite: (keys: string[]) => void;
}

/** The people from the phone book who are not here yet, with the three ways to
 * ask them: one row, the ticked ones, or everyone still waiting. Twin of mWeb's
 * `ContactsInviteList` (rule 27). */
export function ContactsInviteList({
  rows,
  isLoading,
  error,
  synced,
  searching,
  selected,
  result,
  busyKey,
  bulkBusy,
  onToggleSelect,
  onInvite,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (isLoading && rows.length === 0) return <ListSkeleton testID="contacts-invite-loading" />;
  if (error) {
    return (
      <Text testID="contacts-invite-error" padding={24} color="$danger">
        {toErrorMessage(error)}
      </Text>
    );
  }
  if (rows.length === 0) {
    let empty = t('mweb.contacts.everyoneIsHere');
    if (!synced) empty = t('mweb.contacts.notSyncedYet');
    else if (searching) empty = t('mweb.contacts.noMatchesForSearch');
    return (
      <Text
        testID="contacts-invite-empty"
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

  const pending = pendingInviteKeys(rows);
  return (
    <YStack testID="contacts-invite-list" gap={10} paddingHorizontal={16}>
      <Text fontSize={13} color="$muted">
        {t('mweb.contacts.inviteBody')}
      </Text>
      <XStack gap={8}>
        <DuncitButton
          testID="contacts-invite-selected"
          label={t('mweb.contacts.inviteSelected', { vars: { count: selected.length } })}
          variant="outline"
          size="sm"
          disabled={selected.length === 0}
          loading={bulkBusy && selected.length > 0}
          onPress={() => onInvite(selected)}
        />
        <DuncitButton
          testID="contacts-invite-all"
          label={t('mweb.contacts.inviteAll', { vars: { count: pending.length } })}
          variant="solid"
          size="sm"
          disabled={pending.length === 0}
          loading={bulkBusy && selected.length === 0}
          onPress={() => onInvite([])}
        />
      </XStack>
      {result ? (
        <Text
          testID="contacts-invite-result"
          fontSize={13}
          color={result.sent > 0 ? '$success' : '$danger'}
        >
          {t(inviteOutcomeKey(result), { count: result.sent })}
        </Text>
      ) : null}
      {rows.map((row) => (
        <InviteRow
          key={row.phone_key}
          row={row}
          selected={selected.includes(row.phone_key)}
          busy={busyKey === row.phone_key}
          onToggleSelect={onToggleSelect}
          onInvite={(key) => onInvite([key])}
        />
      ))}
    </YStack>
  );
}
