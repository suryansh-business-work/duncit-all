import { Stack, Typography } from '@mui/material';
import HeaderLocationRow from './HeaderLocationRow';
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

  return (
    <Stack sx={{ minWidth: 0 }} spacing={0.1}>
      {onOpenLocation ? (
        <HeaderLocationRow
          selectedLocationName={selectedLocationName}
          selectedZoneName={selectedZoneName}
          loading={loading}
          hasData={hasData}
          onOpen={onOpenLocation}
        />
      ) : null}
      {/* The title also opens the location picker — a bigger tap target than
       * the small city row alone (user ask). */}
      <Typography
        onClick={onOpenLocation}
        sx={{
          fontWeight: 700,
          lineHeight: 1.15,
          fontSize: { xs: '1.05rem', sm: '1.2rem' },
          cursor: onOpenLocation ? 'pointer' : 'default',
        }}
        noWrap
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        noWrap
        sx={{
          color: "text.secondary",
          fontWeight: 500
        }}>
        {t('mweb.home.greetingSubtitle')}
      </Typography>
    </Stack>
  );
}
