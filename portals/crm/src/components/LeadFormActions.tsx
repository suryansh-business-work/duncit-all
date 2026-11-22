import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  submitLabel: string;
  /** A save is in flight (either button). */
  submitting?: boolean;
  /** The in-flight save came from the "& Continue" button. */
  continuing?: boolean;
  /** Validation has failed since the last submit attempt. */
  invalid?: boolean;
  continueLabel?: string;
  onContinue?: () => void;
  onCancel?: () => void;
}

/**
 * Footer of the lead forms: Cancel, "<Update> & Continue" and the primary save.
 * While one save runs the other button is disabled, so a double click cannot
 * send two writes for the same lead.
 */
export default function LeadFormActions({
  submitLabel,
  submitting = false,
  continuing = false,
  invalid = false,
  continueLabel,
  onContinue,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const saving = t('shell.common.saving');
  const savingPrimary = submitting && !continuing;
  const savingContinue = submitting && continuing;

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap', pt: 1 }}>
      {onCancel && (
        <DuncitButton onClick={onCancel} disabled={submitting} data-testid="lead-form-cancel">
          {t('shell.common.cancel')}
        </DuncitButton>
      )}
      {onContinue && (
        <DuncitButton
          variant="outlined"
          onClick={onContinue}
          data-testid="lead-form-submit-continue"
          loading={savingContinue}
          disabled={invalid || savingPrimary}
        >
          {savingContinue ? saving : (continueLabel ?? t('crm.forms.updateAndContinue'))}
        </DuncitButton>
      )}
      <DuncitButton
        type="submit"
        data-testid="lead-form-submit"
        variant="contained"
        loading={savingPrimary}
        disabled={invalid || savingContinue}
      >
        {savingPrimary ? saving : submitLabel}
      </DuncitButton>
    </Stack>
  );
}
