import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** Show the resolve (open) / reopen (closed-within-window) toggle. */
  showToggle: boolean;
  closed: boolean;
  onToggle: () => void;
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

/** Chat header actions: resolve/reopen toggle + .txt / .docx download + email. */
export function ChatHeaderActions({
  showToggle,
  closed,
  onToggle,
  onDownloadTxt,
  onDownloadDocx,
  onEmail,
}: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack gap={6} alignItems="center">
      {showToggle ? (
        <IconButton
          testID="chat-action-toggle"
          label={closed ? 'Re-open chat' : 'Mark resolved'}
          icon={closed ? 'replay' : 'check-circle'}
          color={ink}
          onPress={onToggle}
        />
      ) : null}
      <IconButton
        testID="chat-action-download"
        label="Download transcript"
        icon="file-download"
        color={ink}
        onPress={onDownloadTxt}
      />
      <IconButton
        testID="chat-action-download-docx"
        label="Download Word transcript"
        icon="description"
        color={ink}
        onPress={onDownloadDocx}
      />
      <IconButton
        testID="chat-action-email"
        label="Email transcript"
        icon="email"
        color={ink}
        onPress={onEmail}
      />
    </XStack>
  );
}
