import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PodMediaSummary } from '@/components/pod-media/PodMediaSummary';
import { DuncitDialog } from '@/components/DuncitDialog';
import { CompletePodSettlementDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettlementPreview } from '@/hooks/useSettlementPreview';
import { fireAndForget } from '@/utils/fire-and-forget';
import { SettlementSummary } from './SettlementSummary';
import {
  blankPodCompleteValues,
  buildCompleteInput,
  buildPodCompleteSchema,
  type HostPodForComplete,
  type PodCompleteValues,
} from './pod-complete.form';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  pod: HostPodForComplete | null;
  onClose: () => void;
  onCompleted: () => void;
}

/** Host completes a pod: enter the venue bill amount. The pod's own media is
 * shown, not asked for — it is uploaded on the Upload Pod Media screen. The
 * split is previewed live; on submit two payout releases are created for Finance. */
export function PodCompleteDialog({ pod, onClose, onCompleted }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const hasVenue = !!pod?.venue_id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, watch } = useForm<PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue)),
    defaultValues: blankPodCompleteValues,
  });

  const billAmount = Number(watch('venue_bill_amount')) || 0;
  const {
    settlement,
    isLoading,
    error: previewError,
  } = useSettlementPreview(pod?.id ?? null, billAmount);

  const submit = handleSubmit(async (values) => {
    /* istanbul ignore next -- the dialog only mounts with a pod */
    if (!pod) return;
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        CompletePodSettlementDocument,
        { input: buildCompleteInput(values, pod.id) },
        { auth: true },
      );
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mweb.hostManage.couldNotCompleteThePod'));
    } finally {
      setBusy(false);
    }
  });

  // Closing is refused outright while the settlement is in flight — the backdrop,
  // the header's ✕ and the Cancel button all route through here, so there is one
  // rule rather than three copies of `busy ? undefined : onClose`.
  const closeIfIdle = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="pod-complete-cancel"
        role="button"
        aria-label={t('mweb.common.cancel')}
        aria-disabled={busy}
        onPress={closeIfIdle}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.common.cancel')}
        </Text>
      </XStack>
      <XStack
        testID="pod-complete-submit"
        role="button"
        aria-label={t('mweb.hostManage.completePod')}
        aria-disabled={busy}
        onPress={busy ? undefined : () => fireAndForget(submit())}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={12}
        backgroundColor="$primary"
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {busy ? 'Completing…' : t('mweb.hostManage.completePod')}
        </Text>
      </XStack>
    </XStack>
  );

  // The modal shell is DuncitDialog's, not this file's: it is the component that
  // caps the sheet against the live window, scrolls the body, keeps the footer
  // reachable and handles the keyboard — all of which a hand-rolled <Modal> here
  // got only partly right, and re-stated the scaffold the wallet dialog already had.
  return (
    <DuncitDialog
      open={!!pod}
      onClose={closeIfIdle}
      testID="pod-complete-dialog"
      title={t('mweb.hostManage.completePod')}
      closeLabel={t('mweb.common.close')}
      variant="center"
      dismissOnBackdrop={!busy}
      showCloseButton={!busy}
      footer={footer}
    >
      <YStack gap={12} paddingBottom={6}>
        <Text fontSize={12.5} color="$muted">
          {t('mweb.hostPodActions.completeHint')}
        </Text>
        {hasVenue ? (
          <FormTextField
            control={control}
            name="venue_bill_amount"
            label={t('mweb.hostManage.venueBillAmount')}
            keyboardType="numeric"
            required
          />
        ) : null}
        {pod ? <PodMediaSummary podId={pod.id} onLeave={onClose} /> : null}
        <SettlementSummary settlement={settlement} isLoading={isLoading} />
        {previewError && !settlement && !isLoading ? (
          <Text testID="pod-complete-preview-error" fontSize={12.5} color="$danger">
            {previewError}
          </Text>
        ) : null}
        {error ? (
          <Text testID="pod-complete-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
