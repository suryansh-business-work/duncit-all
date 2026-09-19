import { Box } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import LinkList from './link-list';

/** Every duncit.com/<code> link, what it was made for, and how often it has
 * been followed. */
export default function ShortLinksPage() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 2 }} data-testid="short-links-page">
      <PageHeader
        title={t('shell.nav.shortLinks')}
        subtitle={t('marketing.shortLinks.intro')}
        sx={{ mb: 2 }}
      />
      <LinkList variant="ALL" />
    </Box>
  );
}
