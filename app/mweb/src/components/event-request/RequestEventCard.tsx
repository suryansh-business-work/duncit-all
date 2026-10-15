import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { redirectPathFromLocation } from '../../utils/redirect';
import RequestEventDialog from './RequestEventDialog';
import { MY_EVENT_REQUEST_STATE, type EventRequestTarget, type MyEventRequestState } from './queries';

interface Props {
  targetType: EventRequestTarget;
  targetId: string;
  targetName: string;
}

interface FrameProps {
  icon: ReactNode;
  title?: string;
  hint: string;
  testId: string;
  children?: ReactNode;
}

/** An outlined row: icon, the line(s), and the one action under them. */
function CardFrame({ icon, title, hint, testId, children }: Readonly<FrameProps>) {
  return (
    <Stack
      data-testid={testId}
      direction="row"
      spacing={1.5}
      sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, alignItems: 'flex-start' }}
    >
      <Stack aria-hidden sx={{ color: 'text.secondary', pt: 0.25 }}>
        {icon}
      </Stack>
      <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
        {title && (
          <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 'fontWeightBold' }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
        {children}
      </Stack>
    </Stack>
  );
}

/** Storage can be blocked (private mode): a visitor it cannot read is treated as signed out. */
function hasSession(): boolean {
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

/**
 * Under a host's pods or a venue's Events when nothing is coming up: ask for an
 * event. Signed out it sends the visitor to sign in and back; once asked it
 * says so instead of offering a second request; on the member's own venue or
 * host page it is not shown. Native twin: components/event-request/RequestEventCard.
 */
export default function RequestEventCard({ targetType, targetId, targetName }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const signedIn = hasSession();
  const { data, loading, error, refetch } = useQuery<{ myEventRequestState: MyEventRequestState }>(
    MY_EVENT_REQUEST_STATE,
    { variables: { target_type: targetType, target_id: targetId }, skip: !signedIn, fetchPolicy: 'cache-and-network' },
  );
  const state = data?.myEventRequestState;
  const testId = `request-event-${targetType.toLowerCase()}`;
  const hint =
    targetType === 'VENUE'
      ? t('publicPage.eventRequest.venueHint', { vars: { name: targetName } })
      : t('publicPage.eventRequest.hostHint', { vars: { name: targetName } });

  if (!signedIn) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return (
      <CardFrame icon={<EventNoteIcon />} hint={hint} testId={testId}>
        <DuncitButton variant="contained" onClick={() => navigate(`/login?redirect=${redirect}`)} data-testid={`${testId}-sign-in`}>
          {t('publicPage.eventRequest.signInCta')}
        </DuncitButton>
      </CardFrame>
    );
  }
  if (loading && !state) {
    return <Skeleton variant="rounded" height={96} aria-label={t('mweb.a11y.loading')} data-testid={`${testId}-loading`} />;
  }
  if (error && !state) {
    return (
      <Alert
        severity="warning"
        data-testid={`${testId}-error`}
        action={
          // A failed retry re-renders this state through `error` itself.
          <DuncitButton color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>
            {t('publicPage.eventRequest.retry')}
          </DuncitButton>
        }
      >
        {t('publicPage.eventRequest.loadFailed')}
      </Alert>
    );
  }
  if (!state || state.is_owner) return null;
  if (state.requested) {
    return (
      <CardFrame
        icon={<EventAvailableIcon />}
        title={t('publicPage.eventRequest.requestedTitle')}
        hint={t('publicPage.eventRequest.requestedHint')}
        testId={`${testId}-requested`}
      />
    );
  }
  return (
    <CardFrame icon={<EventNoteIcon />} title={t('publicPage.eventRequest.title')} hint={hint} testId={testId}>
      <DuncitButton variant="contained" onClick={() => setOpen(true)} data-testid={`${testId}-cta`}>
        {t('publicPage.eventRequest.cta')}
      </DuncitButton>
      <RequestEventDialog
        open={open}
        onClose={() => setOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
      />
    </CardFrame>
  );
}
