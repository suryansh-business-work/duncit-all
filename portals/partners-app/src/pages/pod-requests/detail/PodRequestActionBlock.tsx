import { Link as RouterLink } from 'react-router';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { podRequestNextAction } from '@duncit/utils';
import { urlConfigs } from '../../../config/url-configs';
import type { PodRequestDetail } from '../queries';
import { studioPodsPath } from '../side';
import type { PodRequestActions } from '../usePodRequestActions';
import SlotPickBlock from './SlotPickBlock';

interface Props {
  request: PodRequestDetail;
  actions: PodRequestActions;
}

/** A yes / no pair — Accept/Decline, Confirm/Decline slot. */
function AnswerPair({
  yes,
  no,
  busy,
  onAnswer,
}: Readonly<{ yes: string; no: string; busy: boolean; onAnswer: (yes: boolean) => void }>) {
  return (
    <Stack direction="row" spacing={1}>
      <DuncitButton variant="contained" disabled={busy} onClick={() => onAnswer(true)}>
        {yes}
      </DuncitButton>
      <DuncitButton color="error" disabled={busy} onClick={() => onAnswer(false)}>
        {no}
      </DuncitButton>
    </Stack>
  );
}

function Note({ text }: Readonly<{ text: string }>) {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {text}
    </Typography>
  );
}

/**
 * What this side does next, from the shared `podRequestNextAction`: the side
 * that received the request accepts and picks the slot, the side that sent it
 * confirms, and the host creates the pod.
 */
export default function PodRequestActionBlock({ request, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { id } = request;
  const run = (work: Promise<boolean>) => {
    work.catch(() => undefined);
  };

  switch (podRequestNextAction(request)) {
    case 'RESPOND':
      return (
        <AnswerPair
          yes={t('podRequests.accept')}
          no={t('podRequests.decline')}
          busy={actions.busy}
          onAnswer={(accept) => run(actions.respond(id, accept))}
        />
      );
    case 'WITHDRAW':
      return (
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Note text={t('podRequests.waitingAnswer')} />
          <DuncitButton color="error" disabled={actions.busy} onClick={() => run(actions.withdraw(id))}>
            {t('podRequests.withdraw')}
          </DuncitButton>
        </Stack>
      );
    case 'PICK_SLOT':
      return request.venue ? (
        <SlotPickBlock
          venueId={request.venue.id}
          busy={actions.busy}
          onSend={(slotId) => run(actions.sendSlot(id, slotId))}
        />
      ) : null;
    case 'WAIT_SLOT':
      return <Note text={t('podRequests.waitingSlot')} />;
    case 'CONFIRM_SLOT':
      return (
        <AnswerPair
          yes={t('podRequests.confirmSlot')}
          no={t('podRequests.declineSlot')}
          busy={actions.busy}
          onAnswer={(confirm) => run(actions.respondSlot(id, confirm))}
        />
      );
    case 'WAIT_CONFIRM':
      return <Note text={t('podRequests.waitingConfirm')} />;
    case 'CREATE_POD':
      // The console has no host Create Pod flow of its own: the app's, opened
      // with this request, arrives with the venue and the slot already chosen.
      return (
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Note text={t('podRequests.createPodHint')} />
          <DuncitButton
            variant="contained"
            href={`${urlConfigs.mwebUrl}/create-pod?partner_request_id=${encodeURIComponent(id)}`}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewRoundedIcon />}
          >
            {t('podRequests.createPod')}
          </DuncitButton>
        </Stack>
      );
    case 'HOST_CREATES':
      return <Note text={t('podRequests.hostCreatesPod')} />;
    case 'DONE':
      return (
        <DuncitButton
          component={RouterLink}
          to={studioPodsPath(request.viewer_side)}
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('podRequests.viewPod')}
        </DuncitButton>
      );
    default:
      return null;
  }
}
