import { Text, YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

import { AuthLogo } from '@/components/AuthLogo';
import { TwoToneHeading } from '@/components/TwoToneHeading';
import { useAuthFit } from './useAuthFit';

const FIT = auth.fit;

interface Props {
  title: string;
  accentWord?: string;
  subtitle?: string;
}

/**
 * The square logo tile, the two-line headline (second beat in the red text
 * accent) and the subtitle — sized to the window by `useAuthFit`, so a short
 * phone gets a smaller headline instead of a scroll. Colours come from the
 * theme it is rendered in: the dark theme on the hero's scrim, the active one
 * on the flat ground. mWeb twin: components/AuthHeading.
 */
export function AuthHeading({ title, accentWord, subtitle }: Readonly<Props>) {
  const { size } = useAuthFit();
  const gap = size(FIT.gap / 2);
  return (
    <YStack testID="auth-heading" alignItems="flex-start" gap={gap}>
      <YStack marginBottom={gap / 2}>
        <AuthLogo size={size(FIT.logoSize)} square />
      </YStack>
      <TwoToneHeading
        lead={title}
        trail={accentWord}
        trailTone="accent"
        stacked
        fontSize={size(FIT.titleSize, FIT.titleMinSize)}
        align="left"
      />
      {subtitle ? (
        <Text
          testID="auth-heading-subtitle"
          maxWidth={360}
          fontSize={size(FIT.subtitleSize, FIT.subtitleMinSize)}
          color="$muted"
        >
          {subtitle}
        </Text>
      ) : null}
    </YStack>
  );
}
