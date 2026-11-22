import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AiMonitoringChip } from '@/components/ai-monitoring';
import { AttachmentView } from '@/components/AttachmentView';
import { useSupportUpload, type SupportUploadFilter } from '@/hooks/useSupportUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { fireAndForget } from '@/utils/fire-and-forget';

const MAX_ATTACHMENTS = 5;

interface Props {
  attachments: string[];
  onChange: (next: string[]) => void;
  /** Upload folder — support tickets unless a caller says otherwise. */
  folder?: string;
  /** Narrows the picker and judges the picked file (payment evidence). */
  filter?: SupportUploadFilter;
  /** Localized caption ("Files (1/5)") and button, for callers with their own copy. */
  labels?: { caption: string; add: string };
  /** The AI-review chip; off for a private folder the scan never sees. */
  aiMonitoring?: boolean;
}

/**
 * File attachments for a support ticket — RN twin of mWeb's AttachmentsField.
 * Picks + uploads images, videos and documents via {@link useSupportUpload}
 * (video capped at 50 MB) and shows type-aware, removable previews, capped at
 * five.
 */
export function TicketAttachments({
  attachments,
  onChange,
  folder = '/support',
  filter,
  labels,
  aiMonitoring = true,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { uploading, error, pickAndUpload } = useSupportUpload(folder, filter);
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
          {labels?.caption ??
            t('mweb.support.attachFilesCount', {
              vars: { count: attachments.length, max: MAX_ATTACHMENTS },
            })}
        </Text>
        {aiMonitoring ? <AiMonitoringChip testID="ticket-attach-ai-monitoring" /> : null}
        <XStack
          pressStyle={PRESS_STYLE.control}
          testID="ticket-attach-add"
          role="button"
          tabIndex={0}
          aria-label={labels?.add ?? t('mweb.support.addFiles')}
          aria-disabled={disabled}
          onPress={disabled ? undefined : () => fireAndForget(add())}
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
          <Text fontSize={12} fontWeight="600" color="$color">
            {uploading
              ? t('mweb.support.uploadingFiles')
              : (labels?.add ?? t('mweb.support.addFiles'))}
          </Text>
        </XStack>
      </XStack>
      {error ? (
        <Text testID="ticket-attach-error" role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      {attachments.length > 0 ? (
        <XStack flexWrap="wrap" gap={8}>
          {attachments.map((url, i) => (
            <YStack key={url} testID={`ticket-attach-${i}`}>
              <AttachmentView urls={[url]} size={64} />
              <XStack
                pressStyle={PRESS_STYLE.surface}
                testID={`ticket-attach-remove-${i}`}
                role="button"
                tabIndex={0}
                aria-label={t('mweb.common.removeAttachment')}
                hitSlop={11}
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
