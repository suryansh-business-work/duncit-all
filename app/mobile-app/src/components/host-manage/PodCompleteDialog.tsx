import { formResolver } from '../../utils/form-resolver';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PodMediaSummary } from '@/components/pod-media/PodMediaSummary';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettlementPreview } from '@/hooks/useSettlementPreview';
import { fireAndForget } from '@/utils/fire-and-forget';
import { SettlementSummary } from './SettlementSummary';
import { usePodCompleteSubmit } from './usePodCompleteSubmit';
import { PodCompleteFooter, footerLook } from './PodCompleteFooter';
import {
  blankPodCompleteValues,
  buildPodCompleteSchema,
  type HostPodForComplete,
  type PodCompleteValues,
} from './pod-complete.form';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { control, handleSubmit, watch } = useForm<PodCompleteValues, any, PodCompleteValues>({
    resolver: formResolver<PodCompleteValues>(buildPodCompleteSchema(hasVenue)),
    defaultValues: blankPodCompleteValues,
  });

  const billAmount = Number(watch('venue_bill_amount')) || 0;
  const {
    settlement,
    isLoading,
    error: previewError,
  } = useSettlementPreview(pod?.id ?? null, billAmount);

  const { busy, error, run } = usePodCompleteSubmit(
    pod,
    onCompleted,
    t('mweb.hostManage.couldNotCompleteThePod'),
  );
  const submit = handleSubmit(run);

  // Closing is refused outright while the settlement is in flight — the backdrop,
  // the header's ✕ and the Cancel button all route through here, so there is one
  // rule rather than three copies of `busy ? undefined : onClose`.
  const closeIfIdle = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const submitPress = busy ? undefined : () => fireAndForget(submit());
  const { cancelOpacity, submitOpacity, submitLabel, spinner } = footerLook(
    busy,
    onPrimary,
    t('mweb.hostManage.completePod'),
    t('mweb.hostPodActions.completing'),
  );

  const footer = (
    <PodCompleteFooter
      busy={busy}
      cancelLabel={t('mweb.common.cancel')}
      submitLabel={submitLabel}
      submitAriaLabel={t('mweb.hostManage.completePod')}
      spinner={spinner}
      cancelOpacity={cancelOpacity}
      submitOpacity={submitOpacity}
      onCancel={closeIfIdle}
      onSubmit={submitPress}
    />
  );

  const billField = hasVenue ? (
    <FormTextField
      control={control}
      name="venue_bill_amount"
      label={t('mweb.hostManage.venueBillAmount')}
      keyboardType="numeric"
      required
    />
  ) : null;
  const mediaSummary = pod ? <PodMediaSummary podId={pod.id} onLeave={onClose} /> : null;
  // The preview error only speaks when there is nothing better to show.
  const previewErrorText =
    previewError && !settlement && !isLoading ? (
      <Text testID="pod-complete-preview-error" fontSize={12.5} color="$danger">
        {previewError}
      </Text>
    ) : null;
  const errorText = error ? (
    <Text testID="pod-complete-error" fontSize={12.5} color="$danger">
      {error}
    </Text>
  ) : null;

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
        {billField}
        {mediaSummary}
        <SettlementSummary settlement={settlement} isLoading={isLoading} />
        {previewErrorText}
        {errorText}
      </YStack>
    </DuncitDialog>
  );
}
