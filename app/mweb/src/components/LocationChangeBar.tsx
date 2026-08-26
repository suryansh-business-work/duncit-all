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
        px: 1.5,
        py: 1,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <PlaceIcon sx={{ fontSize: 16, color: 'primary.main', flex: '0 0 auto' }} />
        <Typography variant="caption" noWrap sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        spacing={0.25}
        sx={{ alignItems: 'center', color: 'primary.main', flex: '0 0 auto' }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {changeLabel}
        </Typography>
        <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
      </Stack>
    </ButtonBase>
  );
}
