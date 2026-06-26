import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** Show the resolve action (ticket is OPEN/PENDING). */
  canResolve: boolean;
  onResolve: () => void;
  onDownloadTxt: () => void;
  onDownloadDocx: () => void;
  onEmail: () => void;
}

interface IconButtonProps {
  testID: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  onPress: () => void;
}

function IconButton({ testID, label, icon, color, onPress }: Readonly<IconButtonProps>) {
  return (
    <XStack testID={testID} role="button" aria-label={label} onPress={onPress} padding={6}>
      <MaterialIcons name={icon} size={20} color={color} />
    </XStack>
  );
}

/** Ticket header actions: resolve + .txt / .docx download + email (B7/B15). */
export function TicketHeaderActions({
  canResolve,
  onResolve,
  onDownloadTxt,
  onDownloadDocx,
  onEmail,
}: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack gap={6} alignItems="center">
      {canResolve ? (
        <IconButton
          testID="ticket-action-resolve"
          label="Mark resolved"
          icon="check-circle"
          color={ink}
          onPress={onResolve}
        />
      ) : null}
      <IconButton
        testID="ticket-action-download"
        label="Download transcript"
        icon="file-download"
        color={ink}
        onPress={onDownloadTxt}
      />
      <IconButton
        testID="ticket-action-download-docx"
        label="Download Word transcript"
        icon="description"
        color={ink}
        onPress={onDownloadDocx}
      />
      <IconButton
        testID="ticket-action-email"
        label="Email transcript"
        icon="email"
        color={ink}
        onPress={onEmail}
      />
    </XStack>
  );
}
