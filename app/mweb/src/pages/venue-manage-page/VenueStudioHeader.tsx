import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';

/** Venue Studio page header — mark and title. Adding a venue lives on Your Venues. */
export default function VenueStudioHeader() {
  const { t } = useTranslation();

  return (
    <StudioPageHeader
      icon={<StorefrontRoundedIcon fontSize="small" />}
      title={t('mweb.venueManage.venueStudio')}
    />
  );
}
