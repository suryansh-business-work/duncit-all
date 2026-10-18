import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  text: string;
  testID: string;
  tone?: 'info' | 'warning';
}

/** A soft in-place notice — the app has no toast, so news is said where it applies. */
export function GigNote({ text, testID, tone = 'info' }: Readonly<Props>) {
  const { color } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="status"
      aria-live="polite"
      gap={8}
      alignItems="flex-start"
      backgroundColor="$soft"
      borderRadius={14}
      padding={12}
    >
      <MaterialIcons
        name={tone === 'warning' ? 'warning-amber' : 'info-outline'}
        size={16}
        color={color}
      />
      <Text flex={1} fontSize={13} color="$color">
        {text}
      </Text>
    </XStack>
  );
}

/**
 * Contact sharing is free for now and may be charged for later — shown wherever
 * a contact is shared or about to be. mWeb twin: ContactSharingNotice.
 */
export function ContactSharingNotice() {
  const { t } = useTranslation();
  return <GigNote text={t('gigJobs.contact.monetizeNotice')} testID="gig-contact-notice" />;
}
