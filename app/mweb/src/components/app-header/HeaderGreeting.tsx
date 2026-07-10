import { Box, Skeleton, Stack, Typography } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const DEFAULT_TAGLINE = 'It All Starts Here!';

interface Props {
  tagline?: string | null;
  loading: boolean;
  hasData: boolean;
  selectedLocationName?: string;
  selectedZoneName?: string;
  /** Opens the location picker. Omit for the minimal (survey) header — then only the tagline shows. */
  onOpenLocation?: () => void;
}

/** Home header left block: the admin-configurable tagline on top with the
 * tappable city/zone (+ chevron) beneath. Replaces the old logo + mascot. */
export default function HeaderGreeting({
  tagline,
  loading,
  hasData,
  selectedLocationName,
  selectedZoneName,
  onOpenLocation,
}: Readonly<Props>) {
  const title = tagline?.trim() || DEFAULT_TAGLINE;
  const cityText = selectedZoneName
    ? `${selectedLocationName ?? 'Select city'} · ${selectedZoneName}`
    : (selectedLocationName ?? 'Select city');

  return (
    <Stack sx={{ minWidth: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
        {title}
      </Typography>
      {onOpenLocation ? (
        <Box
          role="button"
          tabIndex={0}
          onClick={onOpenLocation}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onOpenLocation();
          }}
          aria-label="Change city or zone"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            cursor: 'pointer',
            color: 'primary.main',
            minWidth: 0,
            maxWidth: { xs: 210, sm: 340 },
          }}
        >
          {loading && !hasData ? (
            <Skeleton variant="text" width={90} height={14} />
          ) : (
            <>
              <Typography
                variant="caption"
                sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}
                noWrap
              >
                {cityText}
              </Typography>
              <KeyboardArrowRightIcon sx={{ fontSize: 16, flex: '0 0 auto' }} />
            </>
          )}
        </Box>
      ) : null}
    </Stack>
  );
}
