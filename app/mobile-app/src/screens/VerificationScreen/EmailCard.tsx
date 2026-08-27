import { Text } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

import type { Verification } from '@/hooks/useVerifications';

import { VerificationCard } from './VerificationCard';

/** Email verification — terminal: "Verified by the App" when verified at login,
 * else "Not Verified". No action for the user. */
export function EmailCard({ item }: Readonly<{ item: Verification }>) {
  const { t } = useTranslation();
  return (
    <VerificationCard item={item}>
      <Text fontSize={12} color="$muted">
        {t('verification.emailNote')}
      </Text>
    </VerificationCard>
  );
}
