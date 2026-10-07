import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from '@duncit/shell';
import type { PodRequestDetail } from '../queries';

/**
 * The other party's contact — only once the pod exists. The server answers
 * `contact` as null before that, and this says so instead of showing nothing.
 */
export default function ContactBlock({ contact }: Readonly<{ contact: PodRequestDetail['contact'] }>) {
  const { t } = useTranslation();
  if (!contact) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('podRequests.contactHidden')}
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
        {t('podRequests.contactTitle')}
      </Typography>
      {contact.phone && (
        <Typography variant="body2">
          {t('podRequests.phone')}: <Link href={`tel:${contact.phone}`}>{contact.phone}</Link>
        </Typography>
      )}
      {contact.email && (
        <Typography variant="body2">
          {t('podRequests.email')}: <Link href={`mailto:${contact.email}`}>{contact.email}</Link>
        </Typography>
      )}
      {contact.address && (
        <Typography variant="body2">
          {t('podRequests.address')}: {contact.address}
        </Typography>
      )}
    </Stack>
  );
}
