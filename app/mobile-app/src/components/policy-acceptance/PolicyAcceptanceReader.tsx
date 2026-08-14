import { ScrollView, Text } from 'tamagui';

import type { SignupPolicy } from '@/stores/policies.store';
import { stripHtml } from '@/utils/html';

/**
 * The full text of one policy, read inside the sheet.
 *
 * Nobody standing at this gate has an account, and the Policy reader screen is
 * registered in the signed-in stack — so the sheet renders the body rather than
 * navigating to it. Same `stripHtml` pass that screen uses, so a policy reads
 * identically here and from the sidebar afterwards.
 */
export function PolicyAcceptanceReader({ policy }: Readonly<{ policy: SignupPolicy }>) {
  return (
    <ScrollView
      testID="policy-acceptance-reader"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      <Text fontSize={14} lineHeight={22} color="$color">
        {stripHtml(policy.content)}
      </Text>
    </ScrollView>
  );
}
