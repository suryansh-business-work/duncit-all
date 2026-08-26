import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { DraftDeleteConfirm } from '@/components/host-manage/DraftDeleteConfirm';
import { HostApplyBanner } from '@/components/host-manage/HostApplyBanner';
import { HostCategoriesCard } from '@/components/host-manage/HostCategoriesCard';
import { HostDraftsSection } from '@/components/host-manage/HostDraftsSection';
import { HostPodsSection } from '@/components/host-manage/HostPodsSection';
import { HostShareSection } from '@/components/host-manage/HostShareSection';
import { useHostPayouts } from '@/hooks/useHostPayouts';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useHostDrafts } from '@/hooks/useHostDrafts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';

/** Hosts Management — start a new pod and resume/delete in-progress drafts. */
export function HostManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color: ink } = useThemeColors();
  const { drafts, isLoading, remove } = useHostDrafts();
  // Owned here (not inside HostShareSection) so completing a pod in the pods
  // section can refetch the share list it just changed.
  const payoutsApi = useHostPayouts();
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
    <StackScreen header title={t('mweb.hostManage.hostsManagement')} testID="host-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          <PrimaryButton
            testID="host-manage-create"
            label={t('mweb.hostManage.createAPod')}
            onPress={() => navigation.navigate('CreatePod')}
          />

          <XStack
            testID="host-manage-insights"
            role="button"
            aria-label={t('mweb.hostManage.hostDashboardAndInsights')}
            onPress={() => navigation.navigate('HostDashboard')}
            alignItems="center"
            justifyContent="center"
            gap={8}
            height={44}
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            pressStyle={{ opacity: 0.85 }}
          >
            <MaterialIcons name="insights" size={18} color={ink} />
            <Text fontSize={14} fontWeight="600" color="$color">
              Dashboard & Insights
            </Text>
          </XStack>

          <HostCategoriesCard />

          <HostApplyBanner />

          {/* Completing a pod creates the payout the share section lists, so
              the screen owns the hook and threads the refetch across. */}
          <HostPodsSection onPodCompleted={() => fireAndForget(payoutsApi.refetch())} />

          <HostShareSection {...payoutsApi} />

          <HostDraftsSection
            drafts={drafts}
            isLoading={isLoading}
            onContinue={(draftId) => navigation.navigate('CreatePod', { draftId })}
            onDelete={setTarget}
          />
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
