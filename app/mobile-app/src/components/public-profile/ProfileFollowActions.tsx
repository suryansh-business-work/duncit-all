import { Text, XStack, YStack } from 'tamagui';
import { followButtonLabelKey, type FollowStatus } from '@duncit/utils';

import { FollowStatusButton } from '@/components/FollowStatusButton';
import { AnswerActions } from '@/components/notifications/FollowRequestActions/FollowActionRows';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  followStatus: FollowStatus;
  /** The other direction of the edge — this person follows the viewer. */
  followsViewer: boolean;
  followBusy: boolean;
  /** Their OPEN ask to follow the viewer, answerable right here. */
  inboundRequestId: string | null;
  answerBusy: boolean;
  onToggleFollow: () => Promise<void>;
  onAnswer: (accept: boolean) => Promise<void>;
}

/**
 * Everything the viewer can do about the follow relationship from a profile.
 *
 * Both directions are read from the profile itself, never from a notification:
 * `followStatus` drives Follow / Follow Back / Requested / Following, and
 * `inboundRequestId` — the owner's open ask to follow the viewer — renders
 * Accept / Deny above it. Answering here and answering in the inbox act on the
 * same FollowRequest, so whichever the viewer reaches first is the one that
 * counts. Twin of mWeb's ProfileFollowActions (rule 27).
 */
export function ProfileFollowActions({
  followStatus,
  followsViewer,
  followBusy,
  inboundRequestId,
  answerBusy,
  onToggleFollow,
  onAnswer,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const answer = (accept: boolean) => {
    if (!answerBusy) onAnswer(accept).catch(() => undefined);
  };

  return (
    <YStack alignItems="center" gap={10}>
      {inboundRequestId ? (
        <XStack
          testID="public-profile-inbound-request"
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          gap={14}
          opacity={answerBusy ? 0.6 : 1}
        >
          <Text fontSize={13.5} fontWeight="700" color="$color">
            {t('mweb.follow.wantsToFollowYou')}
          </Text>
          <AnswerActions
            acceptLabel={t('mweb.follow.accept')}
            denyLabel={t('mweb.follow.reject')}
            accentInk={primary}
            quietInk={muted}
            dimQuiet={false}
            onAccept={() => answer(true)}
            onDeny={() => answer(false)}
          />
        </XStack>
      ) : null}
      <FollowStatusButton
        status={followStatus}
        label={t(followButtonLabelKey(followStatus, followsViewer))}
        busy={followBusy}
        onPress={() => {
          onToggleFollow().catch(() => undefined);
        }}
      />
    </YStack>
  );
}
