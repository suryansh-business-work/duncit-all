import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  onRetry: () => void;
}

/** A failed load says so — an admin with clubs must never be told they have
 * none because the request did not come back. */
export function LoadErrorNotice({ testID, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={10}>
      <Text testID={testID} fontSize={13} color="$danger">
        {t('mweb.studioPods.error')}
      </Text>
      <XStack>
        <DuncitButton
          testID={`${testID}-retry`}
          label={t('mweb.studioPods.retry')}
          onPress={onRetry}
          variant="outline"
          tone="neutral"
        />
      </XStack>
    </YStack>
  );
}
