import { Text } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useTranslation } from '@/hooks/useTranslation';

/** The no-pods empty state — extracted from HomeFeed for the 200-line cap. */
export function HomeEmptyText() {
  const { t } = useTranslation();
  return (
    <Reveal index={4} scale>
      <Text
        testID="home-empty"
        textAlign="center"
        fontSize={13}
        color="$muted"
        paddingHorizontal={24}
        paddingVertical={32}
      >
        {t('mweb.home.homeEmpty')}
      </Text>
    </Reveal>
  );
}
