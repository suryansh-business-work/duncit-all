import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

/**
 * The heads-up that contact sharing is free for now and may be charged for
 * later — shown wherever a contact is shared or about to be (the gig page,
 * the interest dialog, the post form and the interested list).
 */
export default function ContactSharingNotice() {
  const { t } = useTranslation();
  return (
    <Alert severity="info" role="status" data-testid="gig-contact-notice">
      {t('gigJobs.contact.monetizeNotice')}
    </Alert>
  );
}
