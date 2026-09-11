import { Link as RouterLink } from 'react-router';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { DuncitButton } from '@duncit/buttons';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';

/** Venue Studio page header — mark, title, and the "New venue" action. */
export default function VenueStudioHeader() {
  const { t } = useTranslation();

  return (
    <StudioPageHeader
      icon={<StorefrontRoundedIcon fontSize="small" />}
      title={t('mweb.venueManage.venueStudio')}
      action={
        <DuncitButton
          component={RouterLink}
          to="/register-venue"
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          sx={{ flexShrink: 0 }}
        >
          {t('mweb.venueManagePage.newVenue')}
        </DuncitButton>
      }
    />
  );
}
