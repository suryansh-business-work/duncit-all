import { ButtonBase, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlaceIcon from '@mui/icons-material/Place';
import { OPEN_LOCATION_PICKER_EVENT } from './app-header/queries';

interface Props {
  /** "Where the list comes from" — the city name, or the all-cities copy. */
  label: string;
  /** The Change control's text. */
  changeLabel: string;
  ariaLabel: string;
  testId: string;
}

/**
 * A full-width location row: which city a list is narrowed to, and a Change
 * control that opens the SAME header location picker every other screen uses
 * (via its event). Applying there moves the whole app, and the routes remount
 * on the new location id, so the list follows by itself. The Venues page and
 * the three Auto Pod queues each wrap it with their own copy.
 */
export default function LocationChangeBar({
  label,
  changeLabel,
  ariaLabel,
  testId,
}: Readonly<Props>) {
  return (
    <ButtonBase
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={() => globalThis.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT))}
      sx={{
        width: '100%',
        justifyContent: 'space-between',
        gap: 1,
        px: 2,
        minHeight: 48,
        boxSizing: 'border-box',
        borderRadius: 999,
        border: '1px solid var(--duncit-card-border)',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <PlaceIcon sx={{ fontSize: 18, color: 'secondary.main', flex: '0 0 auto' }} />
        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        spacing={0.25}
        sx={{ alignItems: 'center', color: 'primary.main', flex: '0 0 auto' }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
          {changeLabel}
        </Typography>
        <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
      </Stack>
    </ButtonBase>
  );
}
