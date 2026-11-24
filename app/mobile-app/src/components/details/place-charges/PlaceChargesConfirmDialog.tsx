import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { VenueChargesList } from '@/components/checkout/VenueChargesList';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import type { PlaceChargesDialogProps, PlaceChargesReport } from './usePlaceChargesConfirm';

/** The one-tap support line under the charges: a button until the ticket is
 * raised, then the ticket number. Announced as it changes (live region). */
function ReportLine({
  report,
  onReport,
}: Readonly<{ report: PlaceChargesReport; onReport: () => void }>) {
  const { t } = useTranslation();
  const { primary, success } = useThemeColors();
  if (report.status === 'done') {
    return (
      <XStack testID="place-charges-reported" gap={8} alignItems="center" aria-live="polite">
        <MaterialIcons name="check-circle" size={18} color={success} />
        <Text flex={1} fontSize={13} color="$color">
          {t('mweb.podDetails.placeChargesReported', { vars: { ticketNo: report.ticketNo ?? '' } })}
        </Text>
      </XStack>
    );
  }
  const pending = report.status === 'pending';
  const label = pending
    ? t('mweb.podDetails.placeChargesReporting')
    : t('mweb.podDetails.placeChargesReport');
  return (
    <YStack gap={6} aria-live="polite">
      {report.status === 'failed' ? (
        <Text testID="place-charges-report-failed" fontSize={12} color="$danger">
          {t('mweb.podDetails.placeChargesReportFailed')}
        </Text>
      ) : null}
      <Text fontSize={13} color="$muted">
        {t('mweb.podDetails.placeChargesWrongPrompt')}
      </Text>
      <XStack
        testID="place-charges-report"
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-disabled={pending}
        aria-busy={pending}
        onPress={pending ? undefined : onReport}
        pressStyle={PRESS_STYLE.surface}
        alignSelf="flex-start"
        alignItems="center"
        gap={6}
        paddingVertical={8}
      >
        {pending ? (
          <Spinner size="small" color={primary} />
        ) : (
          <MaterialIcons name="support-agent" size={18} color={primary} />
        )}
        <Text fontSize={13} fontWeight="600" color="$accent">
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}

/** Asked before Join / Book on a pod that lists place charges: every charge and
 * the total, said plainly to be paid at the venue with no part for Duncit.
 * mWeb twin: pages/pod-details-page/place-charges/PlaceChargesConfirmDialog. */
export function PlaceChargesConfirmDialog({
  open,
  charges,
  currency,
  report,
  onAccept,
  onCancel,
  onReport,
}: Readonly<PlaceChargesDialogProps>) {
  const { t } = useTranslation();
  const cancelLabel = t('mweb.common.cancel');
  return (
    <DuncitDialog
      open={open}
      onClose={onCancel}
      testID="place-charges-dialog"
      variant="center"
      title={t('mweb.podDetails.placeChargesConfirmTitle')}
      closeLabel={cancelLabel}
      showCloseButton={false}
      footer={
        <ConfirmFooter
          cancelLabel={cancelLabel}
          confirmLabel={t('mweb.podDetails.placeChargesConfirmAccept')}
          busy={false}
          destructive={false}
          cancelTestID="place-charges-dialog-cancel"
          confirmTestID="place-charges-dialog-confirm"
          onCancel={onCancel}
          onConfirm={onAccept}
        />
      }
    >
      <YStack gap={12}>
        <Text fontSize={14} fontWeight="600" color="$color" lineHeight={20}>
          {t('mweb.podDetails.placeChargesConfirmIntro')}
        </Text>
        <VenueChargesList
          charges={charges}
          currency={currency}
          totalLabel={t('mweb.podDetails.placeChargesTotal')}
        />
        <Text fontSize={13} color="$muted" lineHeight={19}>
          {t('mweb.podDetails.placeChargesConfirmNoRole')}
        </Text>
        <ReportLine report={report} onReport={onReport} />
      </YStack>
    </DuncitDialog>
  );
}
