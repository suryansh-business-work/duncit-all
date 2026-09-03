import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { venueCancelPenaltyHeadline, type VenueCancelPodResult } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { VenueCancelPenaltyDocument, VenueCancelPodDocument } from '@/graphql/venue-pods';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';
import type { StudioPod } from './studio-pods';
import {
  makeVenueCancelPodSchema,
  venueCancelPodDefaults,
  type VenueCancelPodValues,
} from '@duncit/forms/schemas';

interface Props {
  pod: StudioPod | null;
  onClose: () => void;
  onCancelled: (result: VenueCancelPodResult) => void;
}

/** The admin-configured penalty, read fresh each time the sheet opens. */
function usePenalty(): number | null {
  const [penalty, setPenalty] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    graphqlRequest(VenueCancelPenaltyDocument, undefined)
      .then((data) => active && setPenalty(data.publicAppSettings.venue_cancel_health_penalty))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return penalty;
}

function CancelPodDialog({ pod, onClose, onCancelled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const penalty = usePenalty();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeVenueCancelPodSchema(t), [t]);
  const { control, handleSubmit } = useForm<VenueCancelPodValues, any, VenueCancelPodValues>({
    resolver: formResolver<VenueCancelPodValues>(schema),
    defaultValues: venueCancelPodDefaults,
  });

  const submit = handleSubmit(async (values) => {
    if (!pod) return;
    setBusy(true);
    setError(null);
    try {
      const data = await graphqlRequest(
        VenueCancelPodDocument,
        { pod_id: pod.id, reason: values.reason },
        { auth: true },
      );
      onCancelled(data.venueCancelPod);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;
  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-cancel-pod-keep"
          label={t('mweb.venuePods.keepPod')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
          disabled={busy}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-cancel-pod-confirm"
          label={busy ? t('mweb.venuePods.cancelling') : t('mweb.venuePods.cancelPod')}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          tone="danger"
          fullWidth
          disabled={busy}
          loading={busy}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!pod}
      onClose={dismiss ?? (() => undefined)}
      testID="venue-cancel-pod"
      title={t('mweb.venuePods.cancelTitle')}
      subtitle={pod ? `${pod.pod_title} · ${formatDateTime(pod.pod_date_time)}` : undefined}
      closeLabel={t('mweb.venuePods.keepPod')}
      variant="center"
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={footer}
    >
      <YStack gap={12}>
        <Text testID="venue-cancel-pod-penalty" fontSize={13.5} fontWeight="700" color="$warning">
          {venueCancelPenaltyHeadline(penalty, t)}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {t('mweb.venuePods.refundsNote')}
        </Text>
        <FormTextField
          control={control}
          name="reason"
          label={t('mweb.venuePods.reason')}
          multiline
          required
        />
        {error ? (
          <Text testID="venue-cancel-pod-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}

/**
 * The venue owner's confirm-and-explain step before a pod is cancelled and
 * refunded — the Tamagui twin of the Partners console's dialog (rule 27).
 * Keyed on the pod so reopening for another one starts from a clean form.
 */
export function VenueCancelPodSheet(props: Readonly<Props>) {
  return <CancelPodDialog key={props.pod?.id ?? 'none'} {...props} />;
}
