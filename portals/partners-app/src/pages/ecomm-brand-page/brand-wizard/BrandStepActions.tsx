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
  /** Every review step is done (consent signed), so the server would accept a submission. */
  canSubmit: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onSubmit: () => void;
  /** Open the brand's details page — offered on the last step (Integration). */
  onFinish: () => void;
}

/**
 * Back / Save draft / Next under every step. Review and Consent carry Submit
 * for review, disabled until the consent is signed and every review step is
 * complete. Integration is the last step and saves itself (each card tests its
 * own connection), so it offers "Go to brand" instead. A locked brand only
 * navigates — and still reaches Integration, which stays editable.
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
  onFinish,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const submitStep = stepKey === 'review' || stepKey === 'consent';

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
  const finishButton = (
    <DuncitButton variant="contained" disabled={busy} onClick={onFinish} data-testid="brand-wizard-finish">
      {t('partners.brandWizard.integration.goToBrand')}
    </DuncitButton>
  );

  if (locked || isLast) {
    return (
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {backButton}
        {isLast ? finishButton : nextButton}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {backButton}
      <DuncitButton variant="outlined" loading={busy} onClick={onSaveDraft} data-testid="brand-wizard-save-draft">
        {t('partners.brandWizard.saveDraft')}
      </DuncitButton>
      {nextButton}
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
