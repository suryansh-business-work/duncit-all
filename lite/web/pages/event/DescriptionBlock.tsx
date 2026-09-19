import { Stack, Typography } from '@mui/material';
import { useWebT } from '../../../shared/i18n';
import { paragraphs } from '../../lib/text';

/** The host's own words, as the paragraphs they typed. */
export function DescriptionBlock({ text }: Readonly<{ text: string }>) {
  const { t } = useWebT();
  const blocks = paragraphs(text);
  if (blocks.length === 0) return null;
  return (
    <Stack spacing={1.5} data-testid="event-description">
      <Typography component="h2" variant="h5">
        {t('liteWeb.event.about')}
      </Typography>
      {blocks.map((block, index) => (
        <Typography key={`${index}-${block.slice(0, 24)}`} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {block}
        </Typography>
      ))}
    </Stack>
  );
}
