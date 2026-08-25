import { ButtonBase, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlaceIcon from '@mui/icons-material/Place';
import { OPEN_LOCATION_PICKER_EVENT } from '../../components/app-header/queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  cityLabel?: string;
}

/** The venue list's location row: which city the venues come from, and a Change
 * control that opens the SAME header location picker every other screen uses
 * (via its event) — applying there moves the whole app, so the list follows.
 * Native twin: VenuesLocationBar. */
export default function VenuesLocationBar({ cityLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = cityLabel
    ? t('mweb.venues.locationIn', { vars: { city: cityLabel } })
    : t('mweb.venues.locationAll');

  return (
    <ButtonBase
      data-testid="venues-location-bar"
      aria-label={t('mweb.venues.changeAria')}
      onClick={() => globalThis.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT))}
      sx={{
        width: '100%',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          minWidth: 0
        }}>
        <PlaceIcon sx={{ fontSize: 16, color: 'primary.main', flex: '0 0 auto' }} />
        <Typography variant="caption" noWrap sx={{
          fontWeight: 700
        }}>
          {label}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        spacing={0.25}
        sx={{
          alignItems: "center",
          color: 'primary.main',
          flex: '0 0 auto'
        }}>
        <Typography variant="caption" sx={{
          fontWeight: 700
        }}>
          {t('mweb.venues.change')}
        </Typography>
        <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
      </Stack>
    </ButtonBase>
  );
}
