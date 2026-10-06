import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteRow } from '../queries/sites';

/** One website in the list: what it is, where it answers, how big it is. */
export default function SiteCard({ site }: Readonly<{ site: CmsSiteRow }>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={RouterLink} to={`/sites/${site.id}`} sx={{ height: '100%' }} data-testid={`cms-site-${site.key}`}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LanguageIcon color="primary" aria-hidden="true" />
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, flex: 1 }} noWrap>
                {site.name}
              </Typography>
              <Chip
                size="small"
                label={site.is_active ? t('shell.common.active') : t('shell.common.inactive')}
                color={site.is_active ? 'success' : 'default'}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {site.domains.length ? site.domains.join(', ') : t('websiteApp.cms.noDomain')}
            </Typography>
            <Typography variant="body2">{t('websiteApp.cms.pageCount', { vars: { count: site.page_count } })}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
