import { Text } from 'tamagui';

import type { Verification } from '@/hooks/useVerifications';

import { VerificationCard } from './VerificationCard';

/** Email verification — terminal: "Verified by the App" when verified at login,
 * else "Not Verified". No action for the user. */
export function EmailCard({ item }: Readonly<{ item: Verification }>) {
  return (
    <VerificationCard item={item}>
      <Text fontSize={12} color="$muted">
        Your email is verified when you sign in — no action needed here.
      </Text>
    </VerificationCard>
  );
}
