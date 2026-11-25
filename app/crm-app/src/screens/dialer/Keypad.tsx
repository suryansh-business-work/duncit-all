import { Text, XStack, YStack } from 'tamagui';
import { CrmTelephony } from 'crm-telephony';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

type Key = (typeof ROWS)[number][number];

/** The letters printed under each digit (ITU E.161, the same on every phone). "+" sits under 0. */
const LETTERS: Partial<Record<Key, string>> = {
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
  '0': '+',
};

/**
 * The dial pad: rounded keys with their letters, each a 64dp-high target read
 * out as "Digit 5". A key press beeps with the phone's dial tone (when its
 * dialling pad tones are on); a long press on 0 types "+".
 */
export function Keypad({ onKey }: Readonly<{ onKey: (key: string) => void }>) {
  const { t } = useTranslation();
  const press = (key: string) => {
    CrmTelephony?.playDialTone(key);
    onKey(key);
  };
  return (
    <YStack gap="$2.5">
      {ROWS.map((row) => (
        <XStack key={row.join('')} gap="$3" justifyContent="center">
          {row.map((key) => (
            <YStack
              key={key}
              role="button"
              aria-label={t('crmApp.dialer.digit', { vars: { digit: key } })}
              onPress={() => press(key)}
              onLongPress={key === '0' ? () => press('+') : undefined}
              flex={1}
              maxWidth={112}
              height={64}
              borderRadius={RADII.lg}
              backgroundColor="$soft"
              alignItems="center"
              justifyContent="center"
              pressStyle={{ backgroundColor: '$primarySoft', scale: 0.97 }}
              testID={`key-${key}`}
            >
              <Text fontSize="$8" fontWeight="700" lineHeight={32}>
                {key}
              </Text>
              {LETTERS[key] ? (
                <Text color="$muted" fontSize="$2" fontWeight="600" letterSpacing={1}>
                  {LETTERS[key]}
                </Text>
              ) : null}
            </YStack>
          ))}
        </XStack>
      ))}
    </YStack>
  );
}
