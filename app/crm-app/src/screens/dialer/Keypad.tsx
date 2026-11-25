import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

/** The dial pad. Each key is a 64dp target announced as "Digit 5". */
export function Keypad({ onKey }: Readonly<{ onKey: (key: string) => void }>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3" alignItems="center">
      {ROWS.map((row) => (
        <XStack key={row.join('')} gap="$5">
          {row.map((key) => (
            <YStack
              key={key}
              role="button"
              aria-label={t('crmApp.dialer.digit', { vars: { digit: key } })}
              onPress={() => onKey(key)}
              width={64}
              height={64}
              borderRadius={32}
              backgroundColor="$soft"
              alignItems="center"
              justifyContent="center"
              pressStyle={{ backgroundColor: '$primarySoft' }}
              testID={`key-${key}`}
            >
              <Text fontSize="$8" fontWeight="600">
                {key}
              </Text>
            </YStack>
          ))}
        </XStack>
      ))}
    </YStack>
  );
}
