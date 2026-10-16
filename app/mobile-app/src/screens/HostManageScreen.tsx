import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { DraftDeleteConfirm } from '@/components/host-manage/DraftDeleteConfirm';
import { HostDraftsSection } from '@/components/host-manage/HostDraftsSection';
import { HostPodsSection } from '@/components/host-manage/HostPodsSection';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useHostDrafts } from '@/hooks/useHostDrafts';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Hosts Management — start a new pod, the host's pods, and their in-progress
 * drafts; nothing else. The figures live on the Host dashboard; publishing, pod
 * and change requests, Host Share and categories each have their own Host
 * Options screen. */
export function HostManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const arrivalNotice =
    useRoute<RouteProp<RootStackParamList, 'HostManage'>>().params?.notice ?? null;
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
    <StackScreen header title={t('mweb.hostManage.hostsManagement')} testID="host-manage-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={24} padding={16} paddingBottom={48}>
          <PrimaryButton
            testID="host-manage-create"
            label={t('mweb.hostManage.createAPod')}
            onPress={() => navigation.navigate('CreatePod')}
          />

          <HostPodsSection arrivalNotice={arrivalNotice} />

          <HostDraftsSection
            drafts={drafts}
            isLoading={isLoading}
            onContinue={(draftId) => navigation.navigate('CreatePod', { draftId })}
            onDelete={setTarget}
          />
        </YStack>
      </RefreshScrollView>
      {target ? (
        <DraftDeleteConfirm
          open
          busy={deleting}
          onCancel={() => setTarget(null)}
          onConfirm={() => fireAndForget(doDelete(target))}
        />
      ) : null}
    </StackScreen>
  );
}
