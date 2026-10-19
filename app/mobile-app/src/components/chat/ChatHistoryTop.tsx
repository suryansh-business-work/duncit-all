import { Spinner, Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useLoadingRegion } from '@/components/Skeleton/useLoadingRegion';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** An older page is on its way. */
  loading: boolean;
  /** The last older page failed — say so and offer it again. */
  failed: boolean;
  /** The server may hold lines older than the ones shown. */
  hasOlder: boolean;
  onLoadOlder: () => void;
  /** `${testIDPrefix}-earlier` (the button) and `${testIDPrefix}-loading-earlier` (the spinner). */
  testIDPrefix: string;
}

/**
 * The top of a chat's scrolling log: a small spinner while an older page loads,
 * else a "Show earlier messages" control — scrolling up loads the page on its
 * own, the control is the same request for screen-reader and switch users who
 * reach the top without scrolling. Nothing once the room's first line is shown.
 */
export function ChatHistoryTop({
  loading,
  failed,
  hasOlder,
  onLoadOlder,
  testIDPrefix,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();
  if (loading) {
    return (
      <YStack alignItems="center" paddingVertical="$2" {...loadingRegion}>
        <Spinner size="small" color="$muted" testID={`${testIDPrefix}-loading-earlier`} />
      </YStack>
    );
  }
  // A failed page leaves `hasOlder` set, so the control is there to ask again.
  if (!hasOlder) return null;
  return (
    <YStack gap="$2" alignItems="center">
      {failed ? (
        <Text role="alert" fontSize="$2" color="$danger" textAlign="center">
          {t('mweb.chat.previewFailed')}
        </Text>
      ) : null}
      <DuncitButton
        testID={`${testIDPrefix}-earlier`}
        label={t('mweb.chat.showEarlier')}
        variant="ghost"
        size="sm"
        onPress={onLoadOlder}
      />
    </YStack>
  );
}
