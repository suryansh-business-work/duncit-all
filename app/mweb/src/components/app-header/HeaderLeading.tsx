import { Chip, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HeaderDeliveryAddress from './HeaderDeliveryAddress';
import HeaderLocationRow from './HeaderLocationRow';
import { STUDIO_LABEL_KEY, type StudioMode } from '../../studio-mode';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  minimal: boolean;
  studio: StudioMode;
  onOpenStudioSwitch: () => void;
  selectedLocationName?: string;
  selectedZoneName?: string;
  placeReady: boolean;
  onOpenLocation: () => void;
  /** On the Pod Shop the city pill gives way to the "Deliver to" address pill. */
  deliveryAddress?: boolean;
  signedIn?: boolean;
}

/**
 * Row one's left side: the location pill, led by the role pill in a studio.
 * A studio header keeps the location switcher — a host/venue/club account
 * still browses a city, so the picker stays. The survey header (`minimal`)
 * has no city to browse yet and shows neither.
 */
export default function HeaderLeading({
  minimal,
  studio,
  onOpenStudioSwitch,
  selectedLocationName,
  selectedZoneName,
  placeReady,
  onOpenLocation,
  deliveryAddress = false,
  signedIn = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (minimal) return <Stack data-testid="header-leading" sx={{ flex: 1, minWidth: 0 }} />;
  return (
    <Stack
      data-testid="header-leading"
      direction="row"
      spacing={1}
      sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}
    >
      {studio === 'USER' ? null : (
        <Chip
          data-testid="header-studio-badge"
          label={t(STUDIO_LABEL_KEY[studio])}
          icon={<SwapHorizIcon />}
          onClick={onOpenStudioSwitch}
          sx={{
            flex: '0 0 auto',
            height: 40,
            px: 0.5,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: 'accent.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18) },
            '& .MuiChip-icon': { color: 'accent.main', fontSize: 16 },
          }}
        />
      )}
      {deliveryAddress ? (
        <HeaderDeliveryAddress signedIn={signedIn} />
      ) : (
        <HeaderLocationRow
          selectedLocationName={selectedLocationName}
          selectedZoneName={selectedZoneName}
          loading={!placeReady}
          hasData={placeReady}
          onOpen={onOpenLocation}
        />
      )}
    </Stack>
  );
}
