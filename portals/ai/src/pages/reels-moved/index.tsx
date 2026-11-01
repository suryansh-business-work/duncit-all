import { useParams } from 'react-router';
import { Alert, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import { urlConfigs } from '../../config/url-configs';

/** Where Reel Studio now lives, in the Marketing console. */
export const REEL_STUDIO_PATH = '/studio/reels';

/**
 * The old address of Reel Studio, kept so a bookmark or a shared link still
 * leads somewhere: the studio itself moved to the Marketing console, beside the
 * social calendar a finished reel is posted from. A link to one reel opens that
 * same reel there. Route: /reels and /reels/:projectId
 */
export default function ReelStudioMovedPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const href = `${urlConfigs.marketingUrl}${REEL_STUDIO_PATH}${projectId ? `/${projectId}` : ''}`;

  return (
    <Box data-testid="reel-studio-moved">
      <PageHeader title={t('ai.reels.moved.title')} sx={{ mb: 2 }} />
      <Alert
        severity="info"
        action={
          <DuncitButton
            variant="contained"
            size="small"
            startIcon={<OpenInNewIcon />}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="reel-studio-moved-open"
          >
            {t('ai.reels.moved.open')}
          </DuncitButton>
        }
      >
        {t('ai.reels.moved.body')}
      </Alert>
    </Box>
  );
}
