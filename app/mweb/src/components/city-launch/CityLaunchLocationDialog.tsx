import { Dialog, DialogActions, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** Called with the answer. Closing the dialog any other way answers No. */
  onAnswer: (locationShared: boolean) => void;
}

/**
 * Asked once, as the name goes on the waitlist: whether the member is willing
 * to share their current location. Yes and No both add the name; the ✕, the
 * backdrop and Escape count as No. The answer is the "Location shared" column
 * in Admin > Catalog > Subscribe for location. Native twin:
 * components/city-launch/CityLaunchLocationDialog.
 */
export default function CityLaunchLocationDialog({ open, onAnswer }: Readonly<Props>) {
  const { t } = useTranslation();
  const decline = () => onAnswer(false);

  return (
    <Dialog
      data-testid="city-launch-share-location"
      open={open}
      onClose={decline}
      fullWidth
      maxWidth="xs"
      aria-labelledby="city-launch-share-location-title"
    >
      <IconButton
        data-testid="city-launch-share-location-close"
        aria-label={t('mweb.common.close')}
        onClick={decline}
        sx={{ position: 'absolute', top: 8, right: 8 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogTitle
        id="city-launch-share-location-title"
        data-testid="city-launch-share-location-title"
        sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, pr: 7 }}
      >
        {t('mweb.cityLaunch.shareLocation.title')}
      </DialogTitle>
      {/* No leads: an Enter pressed on arrival never shares more than the member meant to. */}
      <DialogActions disableSpacing sx={{ gap: 1, px: 3, pt: 1, pb: 3 }}>
        <DuncitButton
          data-testid="city-launch-share-location-no"
          variant="outlined"
          size="large"
          fullWidth
          onClick={decline}
        >
          {t('mweb.cityLaunch.shareLocation.no')}
        </DuncitButton>
        <DuncitButton
          data-testid="city-launch-share-location-yes"
          variant="contained"
          size="large"
          fullWidth
          onClick={() => onAnswer(true)}
        >
          {t('mweb.cityLaunch.shareLocation.yes')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
