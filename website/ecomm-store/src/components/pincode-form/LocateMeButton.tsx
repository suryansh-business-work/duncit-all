import { Alert, Box, Stack, Typography } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DuncitButton } from '@duncit/buttons';
import { mapEmbedUrl } from '@duncit/location';

import { logFailure } from '../../lib/log';
import { useLocatePincode, type LocateState } from '../../lib/useLocatePincode';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

const MAP_HEIGHT = 200;

/** What the last attempt came to: the place found, or why nothing was. */
function Outcome({ state }: Readonly<{ state: LocateState }>) {
  const { t } = useStoreT();
  if (state.status === 'located') {
    return (
      <Typography variant="body2" role="status" data-testid="pincode-located">
        {t('ecommStore.deliverTo.located', { vars: { place: state.place, pincode: state.pincode } })}
      </Typography>
    );
  }
  if (state.status !== 'failed') return null;
  if (state.reason === 'DENIED') {
    return (
      <Alert severity="warning" data-testid="pincode-locate-denied">
        {t('ecommStore.deliverTo.locateDenied')}
      </Alert>
    );
  }
  if (state.reason === 'NO_PINCODE') {
    return (
      <Alert severity="warning" data-testid="pincode-locate-no-pincode">
        {t('ecommStore.deliverTo.locateNoPincode', { vars: { place: state.place } })}
      </Alert>
    );
  }
  return (
    <Alert severity="error" data-testid="pincode-locate-failed">
      {t('ecommStore.deliverTo.locateFailed')}
    </Alert>
  );
}

interface LocateMeButtonProps {
  /** Called with the pincode found, so the form can fill its field. */
  onPincode: (pincode: string) => void;
}

/**
 * "Use my location": asks the browser, reverse-geocodes, and hands the pincode
 * to the form. Hidden when the platform has no Maps key. After a find, a small
 * map shows the spot so the shopper can see it is right.
 */
export function LocateMeButton({ onPincode }: Readonly<LocateMeButtonProps>) {
  const { t } = useStoreT();
  const { available, state, locate } = useLocatePincode();
  if (!available) return null;
  const busy = state.status === 'busy';
  const onClick = () => {
    locate()
      .then((pincode) => {
        if (pincode) onPincode(pincode);
      })
      .catch(logFailure('pincode', 'locate'));
  };
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'stretch' }}>
      <DuncitButton
        variant="outlined"
        startIcon={<MyLocationIcon />}
        loading={busy}
        loadingPosition="start"
        onClick={onClick}
        sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        data-testid="pincode-locate"
      >
        {busy ? t('ecommStore.deliverTo.locating') : t('ecommStore.deliverTo.locate')}
      </DuncitButton>
      <Stack aria-live="polite">
        <Outcome state={state} />
      </Stack>
      {state.status === 'located' ? (
        <Box
          component="iframe"
          title={t('ecommStore.deliverTo.mapTitle')}
          src={mapEmbedUrl(`${state.lat},${state.lng}`)}
          loading="lazy"
          height={MAP_HEIGHT}
          sx={{ width: '100%', border: 0, borderRadius: `${T.radius.control}px`, display: 'block' }}
          data-testid="pincode-map"
        />
      ) : null}
    </Stack>
  );
}
