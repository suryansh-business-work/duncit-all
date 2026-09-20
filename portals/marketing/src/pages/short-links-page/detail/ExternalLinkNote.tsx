import { Alert, AlertTitle, Link, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  destination: string;
}

/**
 * Says plainly where the measurement stops.
 *
 * Every number on this page is recorded by the redirect, before the visitor
 * leaves us. What they did afterwards — signed up, bought something — is
 * reported by the landing page, and this link lands on somebody else's. Saying
 * so is the difference between a missing funnel and a funnel that reads zero.
 */
export default function ExternalLinkNote({ destination }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Alert severity="info" data-testid="external-link-note">
      <AlertTitle>{t('marketing.externalLinks.leavesDuncitTitle')}</AlertTitle>
      <Typography variant="body2">{t('marketing.externalLinks.leavesDuncitBody')}</Typography>
      <Link
        href={destination}
        target="_blank"
        rel="noopener noreferrer nofollow"
        variant="body2"
        sx={{ wordBreak: 'break-all' }}
      >
        {destination}
      </Link>
    </Alert>
  );
}
