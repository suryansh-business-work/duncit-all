import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { DuncitButton } from '@duncit/buttons';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useTranslation } from '../../../i18n/useTranslation';
import VenueChargesList from '../../checkout-page/VenueChargesList';
import type { PlaceChargesDialogProps, PlaceChargesReport } from './usePlaceChargesConfirm';

/** The one-tap support line under the charges: a button until the ticket is
 * raised, then the ticket number. Spoken as it changes (role="status"). */
function ReportLine({ report, onReport }: Readonly<{ report: PlaceChargesReport; onReport: () => void }>) {
  const { t } = useTranslation();
  if (report.status === 'done') {
    return (
      <Alert severity="success" role="status" data-testid="place-charges-reported">
        {t('mweb.podDetails.placeChargesReported', { vars: { ticketNo: report.ticketNo ?? '' } })}
      </Alert>
    );
  }
  const pending = report.status === 'pending';
  return (
    <Stack spacing={1} role="status">
      {report.status === 'failed' && (
        <Alert severity="error" data-testid="place-charges-report-failed">
          {t('mweb.podDetails.placeChargesReportFailed')}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.podDetails.placeChargesWrongPrompt')}
        </Typography>
        <DuncitButton
          variant="text"
          size="small"
          data-testid="place-charges-report"
          disabled={pending}
          startIcon={pending ? <CircularProgress size={14} color="inherit" /> : <SupportAgentIcon />}
          onClick={onReport}
          sx={{ fontWeight: 600 }}
        >
          {pending ? t('mweb.podDetails.placeChargesReporting') : t('mweb.podDetails.placeChargesReport')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}

/** Asked before Join / Book on a pod that lists place charges: every charge and
 * the total, said plainly to be paid at the venue with no part for Duncit.
 * Native twin: components/details/place-charges/PlaceChargesConfirmDialog. */
export default function PlaceChargesConfirmDialog({
  open,
  charges,
  currency,
  report,
  onAccept,
  onCancel,
  onReport,
}: Readonly<PlaceChargesDialogProps>) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      testId="place-charges-dialog"
      title={t('mweb.podDetails.placeChargesConfirmTitle')}
      confirmLabel={t('mweb.podDetails.placeChargesConfirmAccept')}
      onConfirm={onAccept}
      onClose={onCancel}
      message={
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('mweb.podDetails.placeChargesConfirmIntro')}
          </Typography>
          <VenueChargesList
            charges={charges}
            currency={currency}
            totalLabel={t('mweb.podDetails.placeChargesTotal')}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.podDetails.placeChargesConfirmNoRole')}
          </Typography>
          <ReportLine report={report} onReport={onReport} />
        </Stack>
      }
    />
  );
}
