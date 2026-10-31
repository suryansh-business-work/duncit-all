import { Alert, Box, Step, StepButton, StepContent, StepLabel, Stepper, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ReelBriefForm } from '../../../../forms/reel-brief';
import { ReelScriptForm } from '../../../../forms/reel-script';
import type { ReelProject } from '../../types';
import ApplyStep from './ApplyStep';
import ConceptsStep from './ConceptsStep';
import RunProgress from './RunProgress';
import { CREATE_STEPS, useCreateFlow, type CreateFlow, type CreateStep } from './useCreateFlow';

interface Props {
  project: ReelProject;
}

const STEP_LABEL: Readonly<Record<CreateStep, string>> = {
  brief: 'ai.reels.create.stepBrief',
  concepts: 'ai.reels.create.stepConcepts',
  script: 'ai.reels.create.stepScript',
  apply: 'ai.reels.create.stepApply',
};

/** A step is reachable once the step before it has produced what it needs. */
function reachable(flow: CreateFlow, step: CreateStep): boolean {
  if (step === 'brief') return true;
  if (step === 'concepts') return flow.concepts.length > 0;
  return flow.script !== null;
}

/** The open step's own content. The script and apply steps draw nothing until a script exists. */
export function StepBody({ flow, project }: Readonly<{ flow: CreateFlow; project: ReelProject }>) {
  switch (flow.step) {
    case 'brief':
      return <ReelBriefForm initialValues={flow.brief ?? undefined} submitting={flow.busy} onSubmit={flow.findIdeas} />;
    case 'concepts':
      return (
        <ConceptsStep
          concepts={flow.concepts}
          chosen={flow.concept}
          busy={flow.busy}
          onPick={flow.pickConcept}
          onMore={flow.moreIdeas}
          onContinue={flow.writeScript}
        />
      );
    case 'script':
      return flow.script ? <ReelScriptForm key={JSON.stringify(flow.script)} script={flow.script} submitting={flow.busy} onSubmit={flow.useScript} /> : null;
    default:
      return flow.script ? <ApplyStep project={project} script={flow.script} busy={flow.busy} applied={flow.applied} onApply={flow.applyStoryboard} /> : null;
  }
}

/**
 * The Create tab: brief → concepts → script → apply, as a stepper. Every
 * step the writer runs is a marketing run, followed live under the step; a
 * failure stays on the step with its reason, and the step can be run again.
 */
export default function CreatePanel({ project }: Readonly<Props>) {
  const { t } = useTranslation();
  const flow = useCreateFlow(project.id);
  const active = CREATE_STEPS.indexOf(flow.step);

  return (
    <Box component="section" aria-labelledby="reel-create-title" sx={{ p: 2 }} data-testid="reel-create-panel">
      <Typography id="reel-create-title" variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
        {t('ai.reels.create.title')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {t('ai.reels.create.hint')}
      </Typography>
      <Stepper activeStep={active} orientation="vertical" nonLinear>
        {CREATE_STEPS.map((step, index) => (
          <Step key={step} completed={index < active} data-testid={`reel-create-step-${step}`}>
            {reachable(flow, step) && step !== flow.step ? (
              <StepButton onClick={() => flow.goTo(step)} data-testid={`reel-create-goto-${step}`}>
                {t(STEP_LABEL[step])}
              </StepButton>
            ) : (
              <StepLabel>{t(STEP_LABEL[step])}</StepLabel>
            )}
            <StepContent>
              {flow.error !== '' && (
                <Alert severity="error" sx={{ mb: 1.5 }} data-testid="reel-create-error">
                  {flow.error}
                </Alert>
              )}
              <StepBody flow={flow} project={project} />
              <RunProgress runId={flow.runId} working={flow.busy} onAbandon={flow.abandon} />
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
