import { useState } from 'react';
import { Alert, Stack, Step, StepButton, StepLabel, Stepper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { DuncitButton } from '@duncit/buttons';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import type { PodFormValues } from '../types';
import AutoPodCategoryStep from './AutoPodCategoryStep';
import AutoPodDetailsStep from './AutoPodDetailsStep';
import AutoPodReviewStep from './AutoPodReviewStep';
import { useAutoPodAudience } from './useAutoPodAudience';
import { AUTO_POD_DETAIL_FIELDS } from './steps';

export interface AutoPodStepperProps {
  /** Editing an existing Auto Pod: the last button saves rather than rolls out. */
  editing: boolean;
  busy: boolean;
  /** Busy, or the form is mid-submit. */
  disabled: boolean;
  /** The submit error, shown on whichever step is open. */
  error: string | null;
  onCancel: () => void;
}

const CATEGORY = 0;
const DETAILS = 1;
const REVIEW = 2;

/**
 * The Auto Pod template as three steps. Step 1 is the category — and, on the
 * admin console, who could enrol in it: step 2 stays shut until every one of
 * the three counts is above zero. Step 2 is the pod. Step 3 shows it all back
 * read-only above the one button that rolls the offer out to the partners.
 *
 * The form provider around this is `PodForm`'s, so the final button is a
 * plain submit: validation and the mutation are the same path an ordinary pod
 * takes.
 */
export default function AutoPodStepper({
  editing,
  busy,
  disabled,
  error,
  onCancel,
}: Readonly<AutoPodStepperProps>) {
  const { t } = useTranslation();
  const { config } = usePodFormData();
  const { control, trigger } = useFormContext<PodFormValues>();
  const subCategoryId = useWatch({ control, name: 'sub_category_id' });
  const showAudience = !!config.showAutoPodAudience;
  const audience = useAutoPodAudience(subCategoryId, showAudience);
  const [active, setActive] = useState(CATEGORY);
  const [detailsInvalid, setDetailsInvalid] = useState(false);

  const steps = [
    t('podForm.autoPod.stepCategory'),
    t('podForm.autoPod.stepDetails'),
    t('podForm.autoPod.stepReview'),
  ];
  const canLeaveCategory = !!subCategoryId && (!showAudience || audience.complete);

  const next = async () => {
    if (active === CATEGORY) {
      setActive(DETAILS);
      return;
    }
    const valid = await trigger(AUTO_POD_DETAIL_FIELDS);
    setDetailsInvalid(!valid);
    if (valid) setActive(REVIEW);
  };
  const back = () => setActive((step) => Math.max(CATEGORY, step - 1));

  let body = <AutoPodReviewStep />;
  if (active === CATEGORY) body = <AutoPodCategoryStep audience={showAudience ? audience : null} />;
  else if (active === DETAILS) body = <AutoPodDetailsStep />;

  const nextDisabled = active === CATEGORY ? !canLeaveCategory : disabled;
  let submitLabel = editing ? t('podForm.autoPod.saveChanges') : t('podForm.autoPod.rollOut');
  if (busy) submitLabel = t('podForm.autoPod.saving');

  return (
    <Stack spacing={3} data-testid="auto-pod-stepper">
      <Stepper activeStep={active} nonLinear>
        {steps.map((label, index) => {
          const done = index < active;
          return (
            <Step key={label} completed={done}>
              {done ? (
                <StepButton onClick={() => setActive(index)}>{label}</StepButton>
              ) : (
                <StepLabel>{label}</StepLabel>
              )}
            </Step>
          );
        })}
      </Stepper>

      {body}

      {active === DETAILS && detailsInvalid && (
        <Alert severity="error">{t('podForm.autoPod.fixErrors')}</Alert>
      )}
      {/* `whiteSpace: pre-line` keeps a content refusal readable: it arrives as
          a headline followed by one line per rule broken. */}
      {error && (
        <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel}>{t('podForm.common.cancel')}</DuncitButton>
        {active > CATEGORY && (
          <DuncitButton variant="outlined" type="button" startIcon={<ArrowBackIcon />} onClick={back} disabled={disabled}>
            {t('podForm.autoPod.back')}
          </DuncitButton>
        )}
        {/* Two buttons, two keys — never one DOM node that changes type. Next's
            validation resolves in a microtask while the click is still being
            dispatched, and React flushed the review step INTO the same
            <button>: by the time the browser ran the click's activation
            behaviour the node read type="submit", and the offer rolled out
            the moment step 3 opened. A keyed pair mounts a fresh submit
            button the click never touched. */}
        {active < REVIEW ? (
          <DuncitButton
            key="next"
            variant="contained"
            type="button"
            endIcon={<ArrowForwardIcon />}
            onClick={() => {
              next().catch(() => undefined);
            }}
            disabled={nextDisabled}
          >
            {t('podForm.autoPod.next')}
          </DuncitButton>
        ) : (
          <DuncitButton
            key="submit"
            variant="contained"
            type="submit"
            startIcon={<RocketLaunchIcon />}
            disabled={disabled}
          >
            {submitLabel}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
