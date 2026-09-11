import { Text, YStack } from 'tamagui';
import { inviteOutcomeKey } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import type { InviteResult } from '@/hooks/useContactsInvite';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  selectedCount: number;
  busy: boolean;
  /** What the last press did — the app has no toast, so it is said in place. */
  result: InviteResult | null;
  error?: unknown;
  onInviteSelected: () => void;
}

/** Above the invite list: what an invite does, the button that sends the
 * ticked ones, and what the last press did. Each row carries its own Invite.
 * Twin of mWeb's `ContactsInviteBar` (rule 27). */
export function ContactsInviteBar({
  selectedCount,
  busy,
  result,
  error,
  onInviteSelected,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack testID="contacts-invite-bar" gap={10}>
      <Text fontSize={14} color="$muted">
        {t('mweb.contacts.inviteBody')}
      </Text>
      <DuncitButton
        testID="contacts-invite-selected"
        label={t('mweb.contacts.inviteSelected', { vars: { count: selectedCount } })}
        variant="solid"
        size="lg"
        fullWidth
        disabled={selectedCount === 0}
        loading={busy}
        onPress={onInviteSelected}
      />
      {result ? (
        <Text
          testID="contacts-invite-result"
          fontSize={13}
          color={result.sent > 0 ? '$success' : '$danger'}
        >
          {t(inviteOutcomeKey(result), { count: result.sent })}
        </Text>
      ) : null}
      {error ? (
        <Text testID="contacts-invite-error" fontSize={13} color="$danger">
          {toErrorMessage(error)}
        </Text>
      ) : null}
    </YStack>
  );
}
