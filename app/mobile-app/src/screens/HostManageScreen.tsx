import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { DraftDeleteConfirm } from '@/components/host-manage/DraftDeleteConfirm';
import { HostApplyBanner } from '@/components/host-manage/HostApplyBanner';
import { HostPodsSection } from '@/components/host-manage/HostPodsSection';
import { HostShareSection } from '@/components/host-manage/HostShareSection';
import { STEP_TITLES } from '@/components/create-pod';
import { useHostDrafts } from '@/hooks/useHostDrafts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

/** Hosts Management — start a new pod and resume/delete in-progress drafts. */
export function HostManageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { danger } = useThemeColors();
  const { drafts, isLoading, remove } = useHostDrafts();
  const [target, setTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async (id: string) => {
    setDeleting(true);
    try {
      await remove(id);
      setTarget(null);
    } catch {
      /* keep the modal open so the host can retry */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <StackScreen header title="Hosts Management" testID="host-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          <PrimaryButton
            testID="host-manage-create"
            label="Create a Pod"
            onPress={() => navigation.navigate('CreatePod')}
          />

          <HostPodsSection />

          <HostShareSection />

          <Text fontSize={16} fontWeight="900" color="$color">
            Draft pods
          </Text>
          {isLoading ? <Spinner testID="host-manage-loading" color="$primary" /> : null}
          {!isLoading && drafts.length === 0 ? (
            <Text testID="host-manage-empty" fontSize={13} color="$muted">
              No drafts yet. Pods you start saving will show up here.
            </Text>
          ) : null}
          {drafts.map((draft) => {
            const stepLabel = STEP_TITLES[Math.min(draft.step, STEP_TITLES.length - 1)];
            const when = formatWhen(draft.updated_at);
            return (
              <YStack
                key={draft.id}
                gap={8}
                padding={12}
                borderRadius={12}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
              >
                <Text fontSize={14.5} fontWeight="800" color="$color" numberOfLines={1}>
                  {draft.pod_title || 'Untitled pod'}
                </Text>
                <Text fontSize={12} color="$muted">
                  Step {Math.min(draft.step + 1, STEP_TITLES.length)}/{STEP_TITLES.length} ·{' '}
                  {stepLabel}
                  {when ? ` · ${when}` : ''}
                </Text>
                <XStack gap={10} alignItems="center">
                  <XStack
                    testID={`draft-continue-${draft.id}`}
                    role="button"
                    aria-label="Continue draft"
                    onPress={() => navigation.navigate('CreatePod', { draftId: draft.id })}
                    flex={1}
                    height={42}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={10}
                    backgroundColor="$primary"
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={13} fontWeight="900" color="$onPrimary">
                      Continue
                    </Text>
                  </XStack>
                  <XStack
                    testID={`draft-delete-${draft.id}`}
                    role="button"
                    aria-label="Delete draft"
                    onPress={() => setTarget(draft.id)}
                    width={42}
                    height={42}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={10}
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={danger} />
                  </XStack>
                </XStack>
              </YStack>
            );
          })}

          <HostApplyBanner />
        </YStack>
      </ScrollView>
      {target ? (
        <DraftDeleteConfirm
          open
          busy={deleting}
          onCancel={() => setTarget(null)}
          onConfirm={() => void doDelete(target)}
        />
      ) : null}
    </StackScreen>
  );
}
