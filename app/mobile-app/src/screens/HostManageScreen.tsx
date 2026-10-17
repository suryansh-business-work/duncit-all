import { useEffect, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import { logs } from '@duncit/logs';

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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // A refused delete re-reads the list; once the draft is not in it, there is nothing left to confirm.
  useEffect(() => {
    if (target && !isLoading && !drafts.some((draft) => draft.id === target)) setTarget(null);
  }, [target, drafts, isLoading]);

  const closeConfirm = () => {
    setTarget(null);
    setDeleteError(null);
  };

  const doDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await remove(id);
      closeConfirm();
    } catch (error) {
      // The sheet stays open so the host can retry, and says why.
      logs.mobileApp.warn('HostManageScreen', 'deleteDraft', { error });
      setDeleteError(t('mweb.hostManage.draftDeleteFailed'));
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
          error={deleteError}
          onCancel={closeConfirm}
          onConfirm={() => fireAndForget(doDelete(target))}
        />
      ) : null}
    </StackScreen>
  );
}
