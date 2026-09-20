import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { firstGraphQLError } from '@duncit/utils';
import { notifyError } from '../notify';
import { useTranslation } from '../../i18n/useTranslation';
import { redirectPathFromLocation } from '../../utils/redirect';
import CityLaunchLocationDialog from './CityLaunchLocationDialog';
import { LaunchGlass } from './LaunchGlass';
import {
  LOCATION_LAUNCH_STATUS,
  SUBSCRIBE_LOCATION_LAUNCH,
  WHATSAPP_REQUIRED,
  type CityLaunchStatus,
} from './queries';

/** Where the WhatsApp number is edited — the account details dialog. */
const PROFILE_EDIT_PATH = '/account';

interface Props {
  locationId: string;
  city: string;
}

/**
 * The call to action before a name is added. Signed out it sends the visitor
 * to sign in and back here; signed in it first asks whether they will share
 * their current location, then adds them with that answer. The server needs a
 * WhatsApp number to notify, so an account without one is sent to add it.
 * Native twin: components/city-launch/CityLaunchNotify.
 */
export default function CityLaunchNotify({ locationId, city }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [needsWhatsapp, setNeedsWhatsapp] = useState(false);
  const [asking, setAsking] = useState(false);
  const [subscribe] = useMutation<{ subscribeLocationLaunch: CityLaunchStatus }>(SUBSCRIBE_LOCATION_LAUNCH, {
    // The fresh status replaces the page's own query, so it flips to "added"
    // with the new count without asking again.
    update: (cache, { data }) => {
      if (!data) return;
      cache.writeQuery({
        query: LOCATION_LAUNCH_STATUS,
        variables: { locationId },
        data: { locationLaunchStatus: data.subscribeLocationLaunch },
      });
    },
  });
  const signedIn = !!localStorage.getItem('token');

  const onAnswer = async (locationShared: boolean) => {
    setAsking(false);
    try {
      await subscribe({ variables: { locationId, locationShared } });
    } catch (error) {
      if (firstGraphQLError(error)?.extensions?.code === WHATSAPP_REQUIRED) {
        setNeedsWhatsapp(true);
        return;
      }
      logs.mWeb.error('CityLaunchNotify', 'subscribe', { error, locationId });
      notifyError(t('mweb.cityLaunch.subscribeFailed'));
    }
  };

  if (!signedIn) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return (
      <DuncitButton
        data-testid="city-launch-sign-in"
        variant="contained"
        size="large"
        fullWidth
        endIcon={<ArrowForwardIcon />}
        onClick={() => navigate(`/login?redirect=${redirect}`)}
      >
        {t('mweb.cityLaunch.signInCta')}
      </DuncitButton>
    );
  }

  if (needsWhatsapp) {
    return (
      <LaunchGlass testId="city-launch-need-whatsapp">
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 15, lineHeight: 1.4 }}>
            {t('mweb.cityLaunch.needWhatsapp', { vars: { city } })}
          </Typography>
          <DuncitButton
            data-testid="city-launch-go-to-profile"
            variant="contained"
            onClick={() => navigate(PROFILE_EDIT_PATH)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('mweb.cityLaunch.goToProfile')}
          </DuncitButton>
        </Stack>
      </LaunchGlass>
    );
  }

  return (
    <>
      <DuncitButton
        data-testid="city-launch-notify"
        variant="contained"
        size="large"
        fullWidth
        startIcon={<PersonAddIcon />}
        endIcon={<ArrowForwardIcon />}
        onClick={() => setAsking(true)}
      >
        {t('mweb.cityLaunch.notifyCta')}
      </DuncitButton>
      <CityLaunchLocationDialog open={asking} onAnswer={onAnswer} />
    </>
  );
}
