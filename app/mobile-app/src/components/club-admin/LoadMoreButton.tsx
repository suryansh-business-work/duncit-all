import { XStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  busy: boolean;
  onPress: () => void;
}

/** The next page of a paged Club Admin list, on tap — an outlined pill under
 * the list card. */
export function LoadMoreButton({ testID, busy, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack justifyContent="center">
      <DuncitButton
        testID={testID}
        label={t('mweb.clubStudio.loadMore')}
        onPress={onPress}
        variant="outline"
        tone="neutral"
        disabled={busy}
      />
    </XStack>
  );
}
