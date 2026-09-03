import { Link as RouterLink } from 'react-router';
import AddIcon from '@mui/icons-material/Add';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';

/** Venue Studio page header — mark, title, and the "New venue" action. */
export default function VenueStudioHeader() {
  const { t } = useTranslation();

  return (
    <StudioPageHeader
      icon={<StorefrontIcon fontSize="small" />}
      title={t('mweb.venueManage.venueStudio')}
      caption={t('mweb.venueManagePage.listYourSpace')}
      action={
        <DuncitButton
          component={RouterLink}
          to="/register-venue"
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {t('mweb.venueManagePage.newVenue')}
        </DuncitButton>
      }
    />
  );
}
