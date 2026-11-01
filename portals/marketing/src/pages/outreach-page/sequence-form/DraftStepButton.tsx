import { useMutation } from '@apollo/client/react';
import { useFormContext } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { DRAFT_SEQUENCE_STEP, type OutreachDraft, type OutreachStepKind } from '../queries';
import type { SequenceFormValues } from './sequence.types';

interface Props {
  index: number;
  kind: OutreachStepKind;
  sequenceId: string | null;
  /** The kind this step has on the server; a draft is written for what was saved. */
  savedKind: OutreachStepKind | null;
}

/** Claude writes the step's text into the fields. Nothing is saved until the sequence is. */
export default function DraftStepButton({ index, kind, sequenceId, savedKind }: Readonly<Props>) {
  const { t } = useTranslation();
  const { setValue } = useFormContext<SequenceFormValues>();
  const [draft, { loading }] = useMutation<{ draftSequenceStep: OutreachDraft }>(DRAFT_SEQUENCE_STEP);
  const ready = sequenceId !== null && savedKind === kind;

  const run = async () => {
    try {
      const { data } = await draft({ variables: { sequence_id: sequenceId, step_index: index, lead_id: null } });
      /* v8 ignore next -- Apollo rejects a failed mutation, so a resolved one always carries data */
      if (!data) return;
      if (kind === 'EMAIL') setValue(`steps.${index}.subject`, data.draftSequenceStep.subject, { shouldDirty: true, shouldValidate: true });
      setValue(`steps.${index}.body`, data.draftSequenceStep.body, { shouldDirty: true, shouldValidate: true });
      notify(t('marketing.outreach.drafted'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <DuncitButton
        size="small"
        variant="outlined"
        startIcon={<AutoAwesomeIcon />}
        disabled={!ready}
        loading={loading}
        onClick={() => fireAndForget(run(), logs.portal.marketing, 'outreach', 'DraftStepButton')}
        data-testid={`step-${index}-draft`}
      >
        {t('marketing.outreach.draftWithAi')}
      </DuncitButton>
      {!ready && (
        <Typography variant="caption" color="text.secondary" data-testid={`step-${index}-draft-hint`}>
          {t('marketing.outreach.draftSaveFirst')}
        </Typography>
      )}
    </Stack>
  );
}
