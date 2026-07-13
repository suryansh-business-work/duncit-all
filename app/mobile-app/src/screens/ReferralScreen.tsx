import { useState } from 'react';
import { Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useReferral } from '@/hooks/useReferral';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';

/** Refer & Earn — my code (share), the admin-configured gift, who I brought in,
 * and a box to redeem a friend's code. Identical to mWeb's ReferralPage (B4-11). */
export function ReferralScreen() {
  const { onPrimary, primary } = useThemeColors();
  const { referral, isLoading, applyBusy, applyError, applyCode } = useReferral();
  const [draft, setDraft] = useState('');
  const referredList = referral?.referred ?? [];

  const shareCode = async () => {
    /* istanbul ignore next -- the button only mounts once the code loads */
    if (!referral) return;
    try {
      await Share.share({
        message: `Join me on Duncit! Use my referral code ${referral.code} when you sign up.`,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <StackScreen title="Refer & Earn" testID="referral-screen">
      {isLoading && !referral ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="referral-loading" color="$primary" />
        </YStack>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={14} padding={16} paddingBottom={48}>
            <YStack
              gap={6}
              padding={16}
              borderRadius={16}
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$surface"
            >
              <Text fontSize={11} fontWeight="900" color="$muted">
                YOUR CODE
              </Text>
              <XStack alignItems="center" gap={12}>
                <Text
                  testID="referral-code"
                  fontSize={22}
                  fontWeight="900"
                  color="$color"
                  letterSpacing={1}
                >
                  {referral?.code ?? '—'}
                </Text>
                <XStack
                  testID="referral-share"
                  role="button"
                  aria-label="Share referral code"
                  onPress={() => void shareCode()}
                  alignItems="center"
                  gap={6}
                  paddingHorizontal={14}
                  paddingVertical={8}
                  borderRadius={999}
                  backgroundColor="$primary"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <MaterialIcons name="share" size={15} color={onPrimary} />
                  <Text fontSize={12.5} fontWeight="900" color="$onPrimary">
                    Share
                  </Text>
                </XStack>
              </XStack>
              {referral?.gift_description ? (
                <XStack alignItems="center" gap={8} paddingTop={6}>
                  <MaterialIcons name="card-giftcard" size={18} color={primary} />
                  <Text
                    testID="referral-gift"
                    flex={1}
                    fontSize={13}
                    fontWeight="700"
                    color="$color"
                  >
                    {referral.gift_description}
                  </Text>
                </XStack>
              ) : null}
              {referral?.referred_by_name ? (
                <Text testID="referral-referred-by" fontSize={12} color="$muted">
                  You were referred by {referral.referred_by_name}
                </Text>
              ) : null}
            </YStack>

            {referral?.referred_by_name ? null : (
              <YStack
                gap={10}
                padding={16}
                borderRadius={16}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
              >
                <Text fontSize={15} fontWeight="900" color="$color">
                  Got a friend's code?
                </Text>
                <XStack gap={8}>
                  <Input
                    testID="referral-code-input"
                    flex={1}
                    size="$4"
                    backgroundColor="$background"
                    color="$color"
                    placeholderTextColor="$muted"
                    borderColor="$borderColor"
                    autoCapitalize="characters"
                    placeholder="DUN-XXXXXX"
                    value={draft}
                    onChangeText={(text) => setDraft(text.toUpperCase())}
                  />
                  <XStack
                    testID="referral-apply"
                    role="button"
                    aria-label="Apply referral code"
                    aria-disabled={applyBusy || !draft.trim()}
                    onPress={
                      applyBusy || !draft.trim() ? undefined : () => void applyCode(draft.trim())
                    }
                    alignItems="center"
                    justifyContent="center"
                    paddingHorizontal={18}
                    borderRadius={12}
                    backgroundColor="$primary"
                    opacity={applyBusy || !draft.trim() ? 0.6 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={13.5} fontWeight="900" color="$onPrimary">
                      {applyBusy ? 'Applying…' : 'Apply'}
                    </Text>
                  </XStack>
                </XStack>
                {applyError ? (
                  <Text testID="referral-apply-error" fontSize={12.5} color="$danger">
                    {applyError}
                  </Text>
                ) : null}
              </YStack>
            )}

            <Text fontSize={16} fontWeight="900" color="$color">
              Friends you referred ({referredList.length})
            </Text>
            {referredList.length === 0 ? (
              <Text testID="referral-empty" fontSize={13} color="$muted">
                No referrals yet — share your code to get started.
              </Text>
            ) : (
              referredList.map((entry) => (
                <XStack
                  key={entry.user_id}
                  testID={`referral-row-${entry.user_id}`}
                  alignItems="center"
                  gap={10}
                  padding={12}
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  backgroundColor="$surface"
                >
                  <Text flex={1} fontSize={14} fontWeight="800" color="$color" numberOfLines={1}>
                    {entry.full_name || 'New member'}
                  </Text>
                  <Text fontSize={11.5} fontWeight="700" color="$muted">
                    {formatRelative(entry.referred_at)} ago
                  </Text>
                </XStack>
              ))
            )}
          </YStack>
        </ScrollView>
      )}
    </StackScreen>
  );
}
