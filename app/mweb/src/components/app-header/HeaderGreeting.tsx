import { Box, Skeleton, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTranslation } from '../../i18n/useTranslation';

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

/** Home header left block (mock): the tappable pin + city on top, the BIG
 * admin-configurable tagline beneath it, then the greeting subtitle. */
export default function HeaderGreeting({
  tagline,
  loading,
  hasData,
  selectedLocationName,
  selectedZoneName,
  onOpenLocation,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const title = tagline?.trim() || DEFAULT_TAGLINE;
  const cityText = selectedZoneName
    ? `${selectedLocationName ?? 'Select city'} · ${selectedZoneName}`
    : (selectedLocationName ?? 'Select city');

  return (
    <Stack sx={{ minWidth: 0 }} spacing={0.1}>
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
            minHeight: 'auto',
            maxWidth: { xs: 210, sm: 340 },
          }}
        >
          {loading && !hasData ? (
            <Skeleton variant="text" width={90} height={14} />
          ) : (
            <>
              <LocationOnIcon sx={{ fontSize: 15, flex: '0 0 auto' }} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}
                noWrap
              >
                {cityText}
              </Typography>
              <KeyboardArrowDownIcon sx={{ fontSize: 16, flex: '0 0 auto' }} />
            </>
          )}
        </Box>
      ) : null}
      <Typography
        sx={{ fontWeight: 700, lineHeight: 1.12, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
        noWrap
      >
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
        {t('mweb.home.greetingSubtitle')}
      </Typography>
    </Stack>
  );
}
