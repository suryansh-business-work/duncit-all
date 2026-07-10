import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AttachmentView } from '@/components/AttachmentView';
import { useSupportUpload } from '@/hooks/useSupportUpload';
import { useThemeColors } from '@/hooks/useThemeColors';

const MAX_ATTACHMENTS = 5;

interface Props {
  attachments: string[];
  onChange: (next: string[]) => void;
}

/**
 * File attachments for a support ticket — RN twin of mWeb's AttachmentsField.
 * Picks + uploads images, videos and documents via {@link useSupportUpload}
 * (video capped at 50 MB) and shows type-aware, removable previews, capped at
 * five.
 */
export function TicketAttachments({ attachments, onChange }: Readonly<Props>) {
  const { uploading, pickAndUpload } = useSupportUpload('/support');
  const { color: ink } = useThemeColors();
  const disabled = uploading || attachments.length >= MAX_ATTACHMENTS;

  const add = async () => {
    const url = await pickAndUpload();
    if (url) onChange([...attachments, url].slice(0, MAX_ATTACHMENTS));
  };

  return (
    <YStack gap={8}>
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={12} color="$muted">
          Attach files ({attachments.length}/{MAX_ATTACHMENTS})
        </Text>
        <XStack
          testID="ticket-attach-add"
          role="button"
          aria-label="Add files"
          aria-disabled={disabled}
          onPress={disabled ? undefined : () => void add()}
          alignItems="center"
          gap={6}
          paddingHorizontal={10}
          paddingVertical={6}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          opacity={disabled ? 0.5 : 1}
        >
          <MaterialIcons name="attach-file" size={16} color={ink} />
          <Text fontSize={12} fontWeight="800" color="$color">
            {uploading ? 'Uploading…' : 'Add files'}
          </Text>
        </XStack>
      </XStack>
      {attachments.length > 0 ? (
        <XStack flexWrap="wrap" gap={8}>
          {attachments.map((url, i) => (
            <YStack key={url} testID={`ticket-attach-${i}`}>
              <AttachmentView urls={[url]} size={64} />
              <XStack
                testID={`ticket-attach-remove-${i}`}
                role="button"
                aria-label="Remove attachment"
                onPress={() => onChange(attachments.filter((_, j) => j !== i))}
                position="absolute"
                top={-6}
                right={-6}
                width={22}
                height={22}
                borderRadius={11}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <MaterialIcons name="close" size={13} color={ink} />
              </XStack>
            </YStack>
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}
