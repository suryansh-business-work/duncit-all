import { useCallback, useState, type ReactNode } from 'react';
import { useForm , type Resolver } from 'react-hook-form';
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

interface FooterProps {
  busy: boolean;
  cancelLabel: string;
  submitLabel: string;
  submitAriaLabel: string;
  /** The spinner, or null — resolved by the parent so this holds no branch. */
  spinner: ReactNode;
  cancelOpacity: number;
  submitOpacity: number;
  onCancel: () => void;
  /** `undefined` while busy, which is what makes the row inert. */
  onSubmit?: () => void;
}

/** The dialog's two-button footer. Hoisted to module scope: defined inside the
 * dialog it would be a new component type on every render (S6478). */
function PodCompleteFooter({
  busy,
  cancelLabel,
  submitLabel,
  submitAriaLabel,
  spinner,
  cancelOpacity,
  submitOpacity,
  onCancel,
  onSubmit,
}: Readonly<FooterProps>) {
  return (
    <XStack gap={12}>
      <XStack
        testID="pod-complete-cancel"
        role="button"
        aria-label={cancelLabel}
        aria-disabled={busy}
        onPress={onCancel}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={cancelOpacity}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {cancelLabel}
        </Text>
      </XStack>
      <XStack
        testID="pod-complete-submit"
        role="button"
        aria-label={submitAriaLabel}
        aria-disabled={busy}
        onPress={onSubmit}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={12}
        backgroundColor="$primary"
        opacity={submitOpacity}
        pressStyle={PRESS_STYLE.control}
      >
        {spinner}
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {submitLabel}
        </Text>
      </XStack>
    </XStack>
  );
}

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
  const { control, handleSubmit, watch } = useForm<PodCompleteValues, any, PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue)) as unknown as Resolver<PodCompleteValues, any, PodCompleteValues>,
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

  const cancelOpacity = busy ? 0.6 : 1;
  const submitOpacity = busy ? 0.7 : 1;
  const submitPress = busy ? undefined : () => fireAndForget(submit());
  // Resolved here, at nesting zero, rather than inline in the JSX: the same
  // branch costs less to read and keeps the footer itself branch-free.
  const submitLabel = busy ? 'Completing…' : t('mweb.hostManage.completePod');
  const spinner = busy ? <Spinner size="small" color={onPrimary} /> : null;

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
