import { Input, Text, XStack, YStack } from 'tamagui';
import { companionOtpState, type CompanionEntry } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { CompanionOtpApi } from '@/hooks/useCompanionOtp';
import { CompanionOtpPanel } from './CompanionOtpPanel';

interface Props {
  index: number;
  entry: CompanionEntry;
  otp: CompanionOtpApi;
  /** Editing a proved row drops its proof; the number it named has changed. */
  onChange: (index: number, patch: Partial<CompanionEntry>) => void;
  onVerified: (index: number, challengeId: string) => void;
}

/**
 * One of the other people this ticket admits — the Tamagui twin of mWeb's
 * CompanionRow (rule 27).
 *
 * Name and number are what the booking owes the door; the WhatsApp code under
 * them is the option to prove that number belongs to the person holding it.
 */
export function CompanionRow({ index, entry, otp, onChange, onVerified }: Readonly<Props>) {
  const { t } = useTranslation();
  const state = companionOtpState(entry, index, otp.activeIndex);

  return (
    <YStack gap={6}>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {t('mweb.hostScan.companionsHeading', { vars: { index: index + 1 } })}
      </Text>
      <Text fontSize={11.5} color="$muted">
        {t('mweb.hostScan.companionName')} · {t('mweb.hostScan.fieldRequired')}
      </Text>
      <Input
        testID={`companion-name-${index}`}
        value={entry.name}
        onChangeText={(name) => onChange(index, { name })}
        placeholder={t('mweb.hostScan.companionName')}
        size="$4"
      />
      <Text fontSize={11.5} color="$muted">
        {t('mweb.hostScan.companionPhone')} · {t('mweb.hostScan.fieldRequired')}
      </Text>
      <XStack gap={8}>
        <YStack width={96}>
          <Input
            testID={`companion-extension-${index}`}
            value={entry.phone_extension}
            onChangeText={(phone_extension) => onChange(index, { phone_extension })}
            placeholder={t('mweb.hostScan.companionExtension')}
            keyboardType="phone-pad"
            size="$4"
          />
        </YStack>
        <YStack flex={1}>
          <Input
            testID={`companion-phone-${index}`}
            value={entry.phone_number}
            onChangeText={(phone_number) => onChange(index, { phone_number })}
            placeholder={t('mweb.hostScan.companionPhone')}
            keyboardType="number-pad"
            size="$4"
          />
        </YStack>
      </XStack>

      <CompanionOtpPanel
        index={index}
        entry={entry}
        state={state}
        otp={otp}
        onVerified={(challengeId) => onVerified(index, challengeId)}
      />
    </YStack>
  );
}
