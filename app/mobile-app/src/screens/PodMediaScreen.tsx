import { useMemo, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { mwebPodMediaLabels } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { StackScreen } from '@/components/StackScreen';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { PodMediaGrid } from '@/components/pod-media/PodMediaGrid';
import { PodMediaShareCard } from '@/components/pod-media/PodMediaShareCard';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { usePodMediaBoard } from '@/hooks/usePodMediaBoard';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Host Studio > Your Pods > ⋮ > Upload Pod Media — and the screen a guest
 * lands on when they follow the link the host sent them.
 *
 * ONE screen for both, because they do the same thing: add what the evening
 * looked like. The server decides in what capacity each of them arrived, so
 * the host also gets the card that hands the link out, and anyone the link
 * reached who was not marked present is told so instead of being shown a
 * picker whose write would be refused.
 *
 * The mWeb twin is `app/mweb/src/pages/pod-media-page` (rule 27); the picker
 * is the app's own MediaUploadField, so the admin's upload settings, the crop
 * step and the AI image scan behind it are the same ones every other upload in
 * this app goes through.
 */
export function PodMediaScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PodMedia'>>();
  const podId = params?.podId ?? '';
  const labels = useMemo(() => mwebPodMediaLabels(t), [t]);
  const { board, isLoading, error, busy, refetch, add, remove } = usePodMediaBoard(podId);
  // The field is a staging area, never the store: whatever is picked is sent to
  // the pod and the field goes back to empty, so the grid below is always the
  // one true answer to "what is on this pod".
  const [draft, setDraft] = useState('');

  const stage = (text: string) => {
    const urls = splitLines(text);
    if (urls.length === 0) return;
    setDraft('');
    add(urls).catch(() => undefined);
  };

  const body = () => {
    if (isLoading) return <LoadingIndicator />;
    if (!board) {
      return (
        <YStack gap={12}>
          <Text testID="pod-media-error" fontSize={13} color="$danger">
            {error || labels.loadFailed}
          </Text>
          <PillButton
            testID="pod-media-retry"
            label={labels.retry}
            onPress={refetch}
            variant="ghost"
            disabled={false}
          />
        </YStack>
      );
    }

    const isHost = board.viewer === 'HOST';
    return (
      <YStack gap={16}>
        <YStack gap={4}>
          <Text fontSize={16} fontWeight="800">
            {board.pod_title}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {isHost ? labels.hostIntro : labels.guestIntro}
          </Text>
        </YStack>

        {board.viewer === 'NONE' ? (
          <Text testID="pod-media-not-invited" fontSize={12.5} color="$danger">
            {labels.notInvited}
          </Text>
        ) : null}
        {board.is_cancelled ? (
          <Text testID="pod-media-cancelled" fontSize={12.5} color="$warning">
            {labels.cancelled}
          </Text>
        ) : null}

        {/* Only the host hands the link out — a guest already has it. */}
        {isHost ? <PodMediaShareCard pod={board} labels={labels} /> : null}

        {board.can_upload ? (
          <YStack gap={8}>
            <MediaUploadField
              value={draft}
              onChange={stage}
              label={labels.addMedia}
              folder="/pod-media"
              required={false}
              deviceOnly
            />
            {busy ? (
              <Text fontSize={12} color="$muted">
                {labels.uploading}
              </Text>
            ) : null}
          </YStack>
        ) : null}

        <XStack>
          <Text fontSize={13.5} fontWeight="700">
            {labels.itemsHeading(board.count)}
          </Text>
        </XStack>
        <PodMediaGrid
          items={board.items}
          labels={labels}
          onRemove={board.can_upload ? (url) => remove(url).catch(() => undefined) : undefined}
          busy={busy}
        />
        {error ? (
          <Text testID="pod-media-write-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    );
  };

  return (
    <StackScreen title={labels.pageTitle}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>{body()}</ScrollView>
    </StackScreen>
  );
}
