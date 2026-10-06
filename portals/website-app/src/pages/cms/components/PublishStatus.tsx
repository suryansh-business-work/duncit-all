import { Chip, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  published: boolean;
  changes: boolean;
}

/** Live or draft, and whether the draft has moved on from what is live. */
export default function PublishStatus({ published, changes }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ alignItems: 'center', height: '100%' }}>
      <Chip
        size="small"
        label={published ? t('websiteApp.cms.pages.published') : t('websiteApp.cms.pages.draft')}
        color={published ? 'success' : 'default'}
      />
      {published && changes && <Chip size="small" variant="outlined" color="warning" label={t('websiteApp.cms.pages.changes')} />}
    </Stack>
  );
}
