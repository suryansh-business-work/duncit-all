import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface SideProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
}

/** Add note / Schedule follow-up: an icon over its label, dimmed until the number is a CRM contact. */
function SideAction({ icon, label, onPress, disabled, testID }: Readonly<SideProps>) {
  const theme = useTheme();
  return (
    <YStack
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      flex={1}
      minHeight={64}
      alignItems="center"
      justifyContent="center"
      gap="$1"
      opacity={disabled ? 0.4 : 1}
      testID={testID}
    >
      <MaterialIcons name={icon} size={28} color={theme.accentText?.val} />
      <Text fontWeight="600" textAlign="center" numberOfLines={2}>
        {label}
      </Text>
    </YStack>
  );
}

interface Props {
  canCall: boolean;
  /** Add note and follow-up need a CRM contact to attach to. */
  hasLead: boolean;
  onCall: () => void;
  onAddNote: () => void;
  onFollowUp: () => void;
}

/** The row under the dial pad: Add note · the round Call button · Schedule follow-up. */
export function DialerBottomBar({
  canCall,
  hasLead,
  onCall,
  onAddNote,
  onFollowUp,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack alignItems="center" gap="$2" paddingVertical="$2">
      <SideAction
        icon="add-comment"
        label={t('crmApp.lead.addNote')}
        onPress={onAddNote}
        disabled={!hasLead}
        testID="dialer-add-note"
      />
      <YStack
        role="button"
        aria-label={t('crmApp.dialer.call')}
        aria-disabled={!canCall}
        onPress={canCall ? onCall : undefined}
        width={76}
        height={76}
        borderRadius={38}
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
        opacity={canCall ? 1 : 0.5}
        pressStyle={{ backgroundColor: '$primaryPress' }}
        elevation={4}
        testID="dialer-call"
      >
        <MaterialIcons name="call" size={34} color={theme.onPrimary?.val} />
      </YStack>
      <SideAction
        icon="event"
        label={t('crmApp.dialer.followUp')}
        onPress={onFollowUp}
        disabled={!hasLead}
        testID="dialer-follow-up"
      />
    </XStack>
  );
}
