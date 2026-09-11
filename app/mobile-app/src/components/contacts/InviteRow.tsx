import { memo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { invitableName, isInvited, type InvitableContact } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  row: InvitableContact;
  selected: boolean;
  busy: boolean;
  onToggleSelect: (key: string) => void;
  onInvite: (key: string) => void;
}

/** One contact who is not on Duncit: the name it is saved under, a tick box for
 * a bulk invite and its own Invite button. An already-invited row keeps its
 * badge and neither tick nor button — one invite per number, for good.
 * Memoised: it is one cell of a virtualised list thousands long. Twin of
 * mWeb's `InviteRow` (rule 27). */
export const InviteRow = memo(function InviteRow({
  row,
  selected,
  busy,
  onToggleSelect,
  onInvite,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, muted } = useThemeColors();
  const name = invitableName(row);
  const initial = (name[0] ?? '?').toUpperCase();
  const invited = isInvited(row);

  return (
    <XStack
      testID={`contact-invite-row-${row.phone_key}`}
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      {invited ? null : (
        <XStack
          testID={`contact-invite-select-${row.phone_key}`}
          role="checkbox"
          aria-checked={selected}
          aria-label={t('mweb.contacts.selectFor', { vars: { name } })}
          onPress={() => onToggleSelect(row.phone_key)}
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons
            name={selected ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={selected ? primary : muted}
          />
        </XStack>
      )}
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={16} fontWeight="700" color="$onPrimary">
          {initial}
        </Text>
      </YStack>
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize={12.5} color="$muted" numberOfLines={1}>
          {invited ? t('mweb.contacts.invited') : t('mweb.contacts.notOnDuncitYet')}
        </Text>
      </YStack>
      {invited ? null : (
        <DuncitButton
          testID={`contact-invite-${row.phone_key}`}
          label={t('mweb.contacts.invite')}
          variant="outline"
          size="sm"
          loading={busy}
          onPress={() => onInvite(row.phone_key)}
        />
      )}
    </XStack>
  );
});
