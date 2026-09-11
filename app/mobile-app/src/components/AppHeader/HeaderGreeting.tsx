import { YStack } from 'tamagui';

import { TwoToneHeading } from '@/components/TwoToneHeading';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const DEFAULT_TAGLINE = 'It All Starts Here!';

interface Props {
  tagline?: string | null;
  /** The signed-in user's first name — without one the tagline leads alone. */
  firstName?: string | null;
  /** Opens the location picker. Omit for the minimal (survey) header. */
  onOpenLocation?: () => void;
}

/** Home header greeting (row two): "Hello, <name>!" in ink over the
 * admin-configurable tagline in muted, one 24px two-tone heading. The
 * Tamagui twin of mWeb's HeaderGreeting. */
export function HeaderGreeting({ tagline, firstName, onOpenLocation }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = tagline?.trim() || DEFAULT_TAGLINE;
  const name = firstName?.trim();
  const lead = name ? t('mweb.home.greetingHello', { vars: { name } }) : title;
  const trail = name ? title : null;

  // The greeting also opens the location picker — a bigger tap target than
  // the location pill alone (user ask).
  return (
    <YStack marginTop={16} minWidth={0} onPress={onOpenLocation} pressStyle={PRESS_STYLE.inline}>
      <TwoToneHeading testID="header-greeting-title" lead={lead} trail={trail} stacked />
    </YStack>
  );
}
