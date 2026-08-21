import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

import { HeaderLocationRow } from './HeaderLocationRow';

const DEFAULT_TAGLINE = 'It All Starts Here!';

interface Props {
  tagline?: string | null;
  /** Opens the location picker. Omit for the minimal (survey) header — then only the tagline shows. */
  onOpenLocation?: () => void;
}

/** Home header left block (mock): the tappable pin + city on top, the BIG
 * admin-configurable tagline beneath it, then the greeting subtitle. The
 * Tamagui twin of mWeb's HeaderGreeting. */
export function HeaderGreeting({ tagline, onOpenLocation }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = tagline?.trim() || DEFAULT_TAGLINE;

  return (
    <YStack minWidth={0}>
      {onOpenLocation ? <HeaderLocationRow onOpen={onOpenLocation} /> : null}
      {/* The title also opens the location picker — a bigger tap target than
       * the small city row alone (user ask). */}
      <Text
        testID="header-greeting-title"
        fontSize={16.5}
        fontWeight="700"
        color="$color"
        lineHeight={20}
        numberOfLines={1}
        onPress={onOpenLocation}
      >
        {title}
      </Text>
      <Text fontSize={11} fontWeight="500" color="$muted" numberOfLines={1}>
        {t('mweb.home.greetingSubtitle')}
      </Text>
    </YStack>
  );
}
