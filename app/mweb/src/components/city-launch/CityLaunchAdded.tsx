import { Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import ShareIcon from '@mui/icons-material/ShareRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { logs } from '@duncit/logs';
import { copyToClipboard } from '@duncit/utils';
import { notifySuccess } from '../notify';
import { useTranslation } from '../../i18n/useTranslation';
import CityLaunchActionTile from './CityLaunchActionTile';

interface Props {
  locationId: string;
  city: string;
  /** The city's WhatsApp group; '' hides the tile. */
  whatsappGroupUrl: string;
}

/** The link a friend opens — the standalone waitlist route for this city. */
const cityLaunchLink = (locationId: string) => `${globalThis.location.origin}/city-launch/${locationId}`;

/**
 * Once a name is added: the confirmation, a tile to pass the page on (the
 * browser's share sheet, or the link copied where there is none) and, when the
 * admin set one, the city's WhatsApp group. Native twin:
 * components/city-launch/CityLaunchAdded.
 */
export default function CityLaunchAdded({ locationId, city, whatsappGroupUrl }: Readonly<Props>) {
  const { t } = useTranslation();

  const onShare = async () => {
    const url = cityLaunchLink(locationId);
    if (navigator.share) {
      try {
        await navigator.share({ text: t('mweb.cityLaunch.shareText', { vars: { city, url } }) });
      } catch (error) {
        // Closing the share sheet rejects too — nothing to tell the reader.
        logs.mWeb.debug('CityLaunchAdded', 'share', { error });
      }
      return;
    }
    if (await copyToClipboard(url)) {
      notifySuccess(t('mweb.cityLaunch.linkCopied'));
    } else {
      logs.mWeb.warn('CityLaunchAdded', 'copyLink', { msg: 'clipboard unavailable' });
    }
  };

  const onJoinWhatsapp = () => {
    globalThis.open(whatsappGroupUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Stack data-testid="city-launch-added" spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CheckCircleIcon aria-hidden sx={{ color: 'success.main' }} />
        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>
          {t('mweb.cityLaunch.addedTitle')}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 15, lineHeight: 1.4, color: 'text.secondary' }}>
        {t('mweb.cityLaunch.addedBody', { vars: { city } })}
      </Typography>
      <CityLaunchActionTile
        testId="city-launch-share"
        icon={<ShareIcon />}
        label={t('mweb.cityLaunch.shareFriends')}
        onClick={onShare}
      />
      {whatsappGroupUrl ? (
        <CityLaunchActionTile
          testId="city-launch-join-whatsapp"
          icon={<WhatsAppIcon />}
          label={t('mweb.cityLaunch.joinWhatsapp', { vars: { city } })}
          onClick={onJoinWhatsapp}
        />
      ) : null}
    </Stack>
  );
}
