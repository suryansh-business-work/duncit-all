import type { ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack, Tooltip } from '@mui/material';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { canPauseStatus, canResumeStatus } from '../copy';
import { PAUSE_ENROLLMENT, REMOVE_ENROLLMENT, RESUME_ENROLLMENT, type OutreachEnrollment } from '../queries';

interface Props {
  enrollment: OutreachEnrollment;
  onChanged: () => void;
}

function ActionButton({ title, busy, onClick, children }: Readonly<{ title: string; busy: boolean; onClick: () => void; children: ReactNode }>) {
  return (
    <Tooltip title={title}>
      <span>
        <DuncitIconButton size="small" aria-label={title} disabled={busy} onClick={onClick}>
          {children}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}

/** A manager pauses an active enrollment, carries on a paused or failed one, or takes the lead out. */
export default function EnrollmentActions({ enrollment, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [pause, pauseState] = useMutation(PAUSE_ENROLLMENT);
  const [resume, resumeState] = useMutation(RESUME_ENROLLMENT);
  const [remove, removeState] = useMutation(REMOVE_ENROLLMENT);
  const busy = pauseState.loading || resumeState.loading || removeState.loading;
  const variables = { id: enrollment.id };
  const name = enrollment.lead_name;

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      notify(done, 'success');
      onChanged();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const takeOut = async () => {
    const ok = await confirm({
      title: t('marketing.outreach.removeTitle', { vars: { name } }),
      message: t('marketing.outreach.removeMessage'),
      confirmLabel: t('marketing.outreach.remove'),
      destructive: true,
    });
    if (ok) await run(() => remove({ variables }), t('marketing.outreach.removed', { vars: { name } }));
  };

  const fire = (work: Promise<void>) => fireAndForget(work, logs.portal.marketing, 'outreach', 'EnrollmentActions');

  return (
    <Stack direction="row" spacing={0.5} data-testid={`enrollment-actions-${enrollment.id}`}>
      {canPauseStatus(enrollment.status) && (
        <ActionButton title={t('marketing.outreach.pause', { vars: { name } })} busy={busy} onClick={() => fire(run(() => pause({ variables }), t('marketing.outreach.paused', { vars: { name } })))}>
          <PauseCircleOutlineIcon fontSize="small" />
        </ActionButton>
      )}
      {canResumeStatus(enrollment.status) && (
        <ActionButton title={t('marketing.outreach.resume', { vars: { name } })} busy={busy} onClick={() => fire(run(() => resume({ variables }), t('marketing.outreach.resumed', { vars: { name } })))}>
          <PlayCircleOutlineIcon fontSize="small" />
        </ActionButton>
      )}
      <ActionButton title={t('marketing.outreach.removeLabel', { vars: { name } })} busy={busy} onClick={() => fire(takeOut())}>
        <PersonRemoveOutlinedIcon fontSize="small" />
      </ActionButton>
    </Stack>
  );
}
