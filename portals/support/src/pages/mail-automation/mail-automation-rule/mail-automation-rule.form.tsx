import { Button, Stack, Step, StepLabel, Stepper } from '@mui/material';
import type { MailAutomationAccount } from '../../../graphql/mail-automation';
import MailboxStep from '../MailboxStep';
import ReplyMessageStep from '../ReplyMessageStep';
import TicketTypeStep from '../TicketTypeStep';
import { STEP_KEYS, slaLabel, useMailAutomationRule } from './useMailAutomationRule';

interface Props {
  /** The mailbox whose row opened this wizard. */
  account: MailAutomationAccount;
  /** Closes the dialog once a save has landed. */
  onSaved: () => void;
}

/**
 * The three steps the Support portal owns: which mailbox, what it replies, and
 * what an email opens. Step 1 only SHOWS the mailbox — connecting one is Tech's.
 *
 * All of the behaviour lives in `useMailAutomationRule`; this is the render.
 */
export default function MailAutomationRuleForm({ account, onSaved }: Readonly<Props>) {
  const { t, form, step, preview, previewing, savingRule, onPreview, goNext, goBack, goToStep, onSubmit } =
    useMailAutomationRule(account, onSaved);
  const { control, formState, handleSubmit, watch, setValue } = form;

  const isActive = watch('is_active');
  const currentSla = slaLabel(Number(watch('sla_min_hours')), Number(watch('sla_max_hours')));
  const isLastStep = step === STEP_KEYS.length - 1;

  return (
    <>
      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {STEP_KEYS.map((key, index) => (
          <Step key={key} completed={index < step}>
            <StepLabel
              onClick={() => goToStep(index)}
              sx={{ cursor: index < step ? 'pointer' : 'default' }}
            >
              {t(key)}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/*
        The form can ONLY submit from the last step.

        Arriving at step 3 was saving and closing the dialog on its own. Rather
        than chase which control raised the submit — a stray Enter in a number
        field, or React patching the Next button into the Save button at the
        same position — the last step is made the only one where a submit does
        anything at all. Everywhere else it is swallowed, so nothing that
        happens on step 1 or 2 can write the rule.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isLastStep) handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        {step === 0 && (
          <MailboxStep
            account={account}
            active={isActive}
            onActiveChange={(value) => setValue('is_active', value, { shouldDirty: true })}
          />
        )}
        {step === 1 && (
          <ReplyMessageStep
            control={control}
            errors={formState.errors}
            preview={preview}
            previewing={previewing}
            onPreview={onPreview}
          />
        )}
        {step === 2 && (
          <TicketTypeStep control={control} errors={formState.errors} slaLabel={currentSla} />
        )}

        {/* Distinct keys so React builds a NEW button rather than patching the
            Next button into the Save button — a shared DOM node that changes
            its type mid-interaction is exactly the ambiguity above. */}
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          <Button type="button" disabled={step === 0} onClick={goBack}>
            {t('support.mailAutomation.back')}
          </Button>
          {isLastStep ? (
            <Button key="save" type="submit" variant="contained" disabled={savingRule}>
              {savingRule ? t('support.mailAutomation.saving') : t('support.mailAutomation.save')}
            </Button>
          ) : (
            <Button key="next" type="button" variant="contained" onClick={goNext}>
              {t('support.mailAutomation.next')}
            </Button>
          )}
        </Stack>
      </form>
    </>
  );
}
