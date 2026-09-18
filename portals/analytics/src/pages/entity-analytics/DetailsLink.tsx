import { IconButton, Tooltip } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/app-settings';

/**
 * "More details" — the console page holding the records behind a number, in a
 * new tab so the dashboard (and its period) stays where the reader left it.
 * Renders nothing for a number with no page behind it.
 */
export default function DetailsLink({ url, testId }: Readonly<{ url?: string | null; testId?: string }>) {
  const { t } = useTranslation();
  if (!url) return null;
  const label = t('analytics.page.moreDetails');
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        data-testid={testId}
        sx={{ p: 0.5, color: 'text.secondary' }}
      >
        <OpenInNewIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}
