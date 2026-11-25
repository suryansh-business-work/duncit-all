import Svg, { Circle } from 'react-native-svg';
import { Text, YStack, useTheme } from 'tamagui';
import { crmQualityTone, crmRingValue } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

/** The ring's diameter and stroke: the compact one in the hero, the large one in the tab. */
const SIZES = { small: { diameter: 48, stroke: 5 }, large: { diameter: 96, stroke: 8 } } as const;

/** The band tone's theme colour. */
const TONE_COLOUR = { success: 'success', warning: 'warning', error: 'danger' } as const;

interface Props {
  /** 0-100, or null when the lead has not been scored yet. */
  score: number | null | undefined;
  tone?: string | null;
  /** The classification ("Excellent"), read out with the score. */
  label?: string | null;
  size?: keyof typeof SIZES;
  /** Makes the ring a button (open the Quality Score tab). */
  onPress?: () => void;
  testID?: string;
}

/**
 * A lead's Lead Quality Score as the portal's ring: a circle filled to the
 * score out of 100 in the band's colour, the number in the middle.
 */
export function QualityRing({
  score,
  tone,
  label,
  size = 'small',
  onPress,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { diameter, stroke } = SIZES[size];
  const value = crmRingValue(score);
  const shown = value === null ? '—' : String(Math.round(value));
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const aria =
    value === null
      ? t('crm.leadQuality.notScored')
      : t('crm.leadQuality.ringAria', { vars: { score: shown, label: label ?? '' } });
  return (
    <YStack
      width={diameter}
      height={diameter}
      alignItems="center"
      justifyContent="center"
      role={onPress ? 'button' : 'img'}
      aria-label={onPress ? t('crm.leadQuality.openBreakdown', { vars: { score: shown } }) : aria}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
    >
      <Svg width={diameter} height={diameter} style={{ position: 'absolute' }}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme.soft?.val}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme[TONE_COLOUR[crmQualityTone(tone)]]?.val}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - (value ?? 0) / 100)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${diameter / 2}, ${diameter / 2}`}
        />
      </Svg>
      <Text fontWeight="800" fontSize={size === 'large' ? '$7' : '$3'}>
        {shown}
      </Text>
      {size === 'large' && value !== null ? (
        <Text color="$muted" fontSize="$1">
          {t('crm.leadQuality.outOf100')}
        </Text>
      ) : null}
    </YStack>
  );
}
