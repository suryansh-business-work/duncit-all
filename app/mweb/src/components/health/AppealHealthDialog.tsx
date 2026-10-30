import { useMutation } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { isHealthAppealReason } from '@duncit/utils';
import { notifySuccess } from '../notify';
import { AppealHealthForm, type HealthAppealValues } from './appeal-health-form';
import { APPEAL_HEALTH_ADJUSTMENT, HEALTH_QUERY_NAMES, type HealthAdjustment } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

const FORM_ID = 'appeal-health-form';

interface BodyProps {
  adjustment: HealthAdjustment;
  onClose: () => void;
}

/** Mounted only while a deduction is selected, so each one starts from a clean form. */
function AppealBody({ adjustment, onClose }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  // The row's Appeal button turns into "Appeal pending" from the refetched health.
  const [appeal, state] = useMutation(APPEAL_HEALTH_ADJUSTMENT, {
    refetchQueries: HEALTH_QUERY_NAMES,
    awaitRefetchQueries: true,
  });

  const submit = async (values: HealthAppealValues) => {
    // The schema has already refused anything else; this narrows the type.
    if (!isHealthAppealReason(values.reason)) return;
    await appeal({
      variables: {
        input: { adjustment_id: adjustment.id, reason: values.reason, message: values.message },
      },
    });
    notifySuccess(t('healthAppeal.submitted'));
    onClose();
  };

  return (
    <>
      <DialogTitle id="appeal-health-title">
        {t('healthAppeal.title')}
        <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
          {t('healthAppeal.subtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} data-testid="appeal-health-deduction">
            {t('healthAppeal.deductionLine', {
              vars: { points: Math.abs(adjustment.delta), remark: adjustment.remark || '—' },
            })}
          </Typography>
          <AppealHealthForm formId={FORM_ID} onSubmit={submit} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={state.loading} data-testid="appeal-health-cancel">
          {t('healthAppeal.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={FORM_ID}
          variant="contained"
          disabled={state.loading}
          data-testid="appeal-health-submit"
        >
          {state.loading ? t('healthAppeal.sending') : t('healthAppeal.submit')}
        </DuncitButton>
      </DialogActions>
    </>
  );
}

interface Props {
  /** The deduction being appealed; null keeps the dialog closed. */
  adjustment: HealthAdjustment | null;
  onClose: () => void;
}

/** Appeal one health deduction to Legal. Native twin: AppealHealthSheet (rule 27). */
export default function AppealHealthDialog({ adjustment, onClose }: Readonly<Props>) {
  return (
    <Dialog
      open={!!adjustment}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="appeal-health-title"
      data-testid="appeal-health-dialog"
    >
      {adjustment && <AppealBody adjustment={adjustment} onClose={onClose} />}
    </Dialog>
  );
}
