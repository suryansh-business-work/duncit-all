import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';
import type { GigJob } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { SetGigJobStatusDocument } from '@/graphql/gigs';
import { GigJobStatus } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

/** The poster's controls: edit, and close (after a confirm) or reopen. mWeb twin: GigOwnerActions. */
export function GigOwnerActions({
  job,
  onChanged,
}: Readonly<{ job: GigJob; onChanged: (job: GigJob) => void }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const open = job.status === 'OPEN';

  const setStatus = async () => {
    setBusy(true);
    try {
      const status = open ? GigJobStatus.Closed : GigJobStatus.Open;
      const res = await graphqlRequest(
        SetGigJobStatusDocument,
        { id: job.id, status },
        { auth: true },
      );
      onChanged(res.setGigJobStatus);
      setNotice(t('gigJobs.detail.statusSaved'));
    } catch {
      setNotice(t('gigJobs.detail.statusFailed'));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <YStack gap={8}>
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          label={t('gigJobs.detail.edit')}
          onPress={() => navigation.navigate('GigJobForm', { id: job.id })}
          testID="gig-edit"
        />
        <DuncitButton
          label={open ? t('gigJobs.detail.close') : t('gigJobs.detail.reopen')}
          variant="outline"
          tone={open ? 'danger' : 'primary'}
          loading={busy}
          onPress={() => (open ? setConfirming(true) : fireAndForget(setStatus()))}
          testID="gig-toggle-status"
        />
      </XStack>
      {notice ? (
        <Text role="status" fontSize={12.5} color="$muted" testID="gig-status-notice">
          {notice}
        </Text>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t('gigJobs.detail.closeConfirmTitle')}
        message={t('gigJobs.detail.closeConfirmBody')}
        confirmLabel={t('gigJobs.detail.close')}
        destructive
        busy={busy}
        onConfirm={() => fireAndForget(setStatus())}
        onCancel={() => setConfirming(false)}
        testID="gig-close-confirm"
      />
    </YStack>
  );
}
