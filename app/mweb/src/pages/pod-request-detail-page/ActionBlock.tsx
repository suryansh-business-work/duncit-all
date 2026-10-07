import { Link as RouterLink } from 'react-router';
import { Alert, Stack, Typography } from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { DuncitButton } from '@duncit/buttons';
import { podRequestNextAction } from '@duncit/utils';
import RespondButtons from '../pod-requests/components/RespondButtons';
import type { PodRequestDetail } from '../pod-requests/queries';
import type { PodRequestActions } from '../pod-requests/usePodRequestActions';
import { useTranslation } from '../../i18n/useTranslation';
import PickSlotBlock from './PickSlotBlock';

interface Props {
  request: PodRequestDetail;
  actions: PodRequestActions;
}

const ignore = () => undefined;

/**
 * What the viewer's side can do now (the shared `podRequestNextAction`):
 * answer it, withdraw it, pick the slot, answer the slot, create the pod — or
 * the line that says whose move it is.
 */
export default function ActionBlock({ request, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const waiting = (text: string) => <Alert severity="info">{text}</Alert>;

  switch (podRequestNextAction(request)) {
    case 'RESPOND':
      return (
        <RespondButtons
          acceptLabel={t('podRequests.accept')}
          declineLabel={t('podRequests.decline')}
          busy={actions.busy}
          onAnswer={(accept) => {
            actions.respond(request.id, accept).catch(ignore);
          }}
          testId="pod-request-respond"
        />
      );
    case 'WITHDRAW':
      return (
        <Stack spacing={1.5}>
          {waiting(t('podRequests.waitingAnswer'))}
          <DuncitButton
            variant="outlined"
            color="error"
            disabled={actions.busy}
            onClick={() => {
              actions.withdraw(request.id).catch(ignore);
            }}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="pod-request-withdraw"
          >
            {t('podRequests.withdraw')}
          </DuncitButton>
        </Stack>
      );
    case 'PICK_SLOT':
      return request.venue ? (
        <PickSlotBlock
          venueId={request.venue.id}
          busy={actions.busy}
          onSend={(slotId) => actions.requestSlot(request.id, slotId)}
        />
      ) : null;
    case 'WAIT_SLOT':
      return waiting(t('podRequests.waitingSlot'));
    case 'CONFIRM_SLOT':
      return (
        <RespondButtons
          acceptLabel={t('podRequests.confirmSlot')}
          declineLabel={t('podRequests.declineSlot')}
          busy={actions.busy}
          onAnswer={(confirm) => {
            actions.respondSlot(request.id, confirm).catch(ignore);
          }}
          testId="pod-request-slot-answer"
        />
      );
    case 'WAIT_CONFIRM':
      return waiting(t('podRequests.waitingConfirm'));
    case 'CREATE_POD':
      return (
        <Stack spacing={1.5}>
          <Typography variant="body2">{t('podRequests.createPodHint')}</Typography>
          <DuncitButton
            component={RouterLink}
            to={`/create-pod?partner_request_id=${encodeURIComponent(request.id)}`}
            variant="contained"
            size="large"
            startIcon={<AddCircleOutlineRoundedIcon />}
            data-testid="pod-request-create-pod"
          >
            {t('podRequests.createPod')}
          </DuncitButton>
        </Stack>
      );
    case 'HOST_CREATES':
      return waiting(t('podRequests.hostCreatesPod'));
    default:
      return null;
  }
}
