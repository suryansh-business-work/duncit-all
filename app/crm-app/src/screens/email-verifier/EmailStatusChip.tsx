import { Text, XStack } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

type Status = 'VERIFIED' | 'RISKY' | 'INVALID' | 'UNKNOWN';

/** The portal chip's colour per verdict, as theme keys (success, warning, danger, muted). */
const TONE: Record<Status, string> = {
  VERIFIED: '$success',
  RISKY: '$warning',
  INVALID: '$danger',
  UNKNOWN: '$muted',
};

/** Literal keys per verdict — the portal's own (crm.emailVerifier.status*). */
const COPY: Record<Status, string> = {
  VERIFIED: 'crm.emailVerifier.statusVerified',
  RISKY: 'crm.emailVerifier.statusRisky',
  INVALID: 'crm.emailVerifier.statusInvalid',
  UNKNOWN: 'crm.emailVerifier.statusUnknown',
};

/** An address's verdict as the portal shows it: an outlined chip in the verdict's colour. */
export function EmailStatusChip({ status }: Readonly<{ status: Status }>) {
  const { t } = useTranslation();
  return (
    <XStack
      borderWidth={1}
      borderColor={TONE[status]}
      borderRadius={RADII.pill}
      paddingHorizontal="$2.5"
      paddingVertical="$1"
    >
      <Text color={TONE[status]} fontSize="$2" fontWeight="700">
        {t(COPY[status])}
      </Text>
    </XStack>
  );
}
