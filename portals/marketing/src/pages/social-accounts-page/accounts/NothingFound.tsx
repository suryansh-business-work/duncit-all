import { Alert, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { PROVIDER_LABEL } from '../copy';
import type { SocialPendingConnection } from '../queries';

/** The grants that come through Meta's Account Center, where a Page and its Instagram account are picked. */
const META_PROVIDERS = new Set(['FACEBOOK', 'INSTAGRAM']);

/**
 * A grant that reached no account, said plainly: what was found (none) and
 * the real reasons it happens — never a generic "something went wrong". Meta
 * gets its three causes; any other network the one that applies there.
 */
export default function NothingFound({ connection }: Readonly<{ connection: SocialPendingConnection }>) {
  const { t } = useTranslation();
  const provider = t(PROVIDER_LABEL[connection.provider]);
  if (!META_PROVIDERS.has(connection.provider)) {
    return (
      <Alert severity="warning" data-testid="connect-picker-nothing">
        {t('marketing.socialPicker.nothingOther', { vars: { provider } })}
      </Alert>
    );
  }
  return (
    <Stack spacing={1.5} data-testid="connect-picker-nothing">
      <Alert severity="warning">{t('marketing.socialPicker.foundMeta', { vars: { pages: connection.pages_found, instagram: connection.instagram_found } })}</Alert>
      <Typography variant="subtitle2" component="h3">
        {t('marketing.socialPicker.causesTitle')}
      </Typography>
      <List dense disablePadding>
        <ListItem disableGutters>
          <ListItemText primary={t('marketing.socialPicker.causeNotProfessional')} />
        </ListItem>
        <ListItem disableGutters>
          <ListItemText primary={t('marketing.socialPicker.causeNotLinked')} />
        </ListItem>
        <ListItem disableGutters>
          <ListItemText primary={t('marketing.socialPicker.causeNotTicked')} />
        </ListItem>
      </List>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('marketing.socialPicker.tryAgain')}
      </Typography>
    </Stack>
  );
}
