import { Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import type { BrandWizardStepKey } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  index: number;
  total: number;
  stepKey: BrandWizardStepKey;
  locked: boolean;
  busy: boolean;
  /** Every required step is done, so the server would accept a submission. */
  canSubmit: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/**
 * Back / Save draft / Next under every step. Review and the last step (Consent)
 * carry Submit for review instead, disabled until the consent is signed and
 * every required step is complete. A locked brand only navigates.
 */
export default function BrandStepActions({
  index,
  total,
  stepKey,
  locked,
  busy,
  canSubmit,
  onBack,
  onSaveDraft,
  onNext,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const submitStep = stepKey === 'review' || isLast;

  const backButton = (
    <DuncitButton disabled={isFirst || busy} onClick={onBack} data-testid="brand-wizard-back">
      {t('partners.brandWizard.back')}
    </DuncitButton>
  );
  const nextButton = (
    <DuncitButton variant={submitStep ? 'outlined' : 'contained'} disabled={busy} onClick={onNext} data-testid="brand-wizard-next">
      {t('partners.brandWizard.next')}
    </DuncitButton>
  );

  if (locked) {
    return (
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {backButton}
        {!isLast && nextButton}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {backButton}
      <DuncitButton variant="outlined" loading={busy} onClick={onSaveDraft} data-testid="brand-wizard-save-draft">
        {t('partners.brandWizard.saveDraft')}
      </DuncitButton>
      {!isLast && nextButton}
      {submitStep && (
        <DuncitButton
          variant="contained"
          endIcon={<SendIcon />}
          disabled={busy || !canSubmit}
          onClick={onSubmit}
          data-testid="brand-wizard-submit"
        >
          {t('partners.brandWizard.submit')}
        </DuncitButton>
      )}
    </Stack>
  );
}
