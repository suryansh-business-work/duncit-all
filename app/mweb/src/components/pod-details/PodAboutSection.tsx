import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  description?: string | null;
  info?: string | null;
}

const TRUNCATE = 320;

export default function PodAboutSection({ description, info }: Readonly<Props>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const text = (description ?? '').trim();
  const isLong = text.length > TRUNCATE;
  const shown = !isLong || expanded ? text : text.slice(0, TRUNCATE) + '\u2026';

  return (
    <Stack spacing={1.5}>
      {text ? (
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              whiteSpace: 'pre-wrap'
            }}>
            {shown}
          </Typography>
          {isLong && (
            <DuncitButton size="small" onClick={() => setExpanded((v) => !v)} sx={{ mt: 0.5, p: 0 }}>
              {expanded ? t('mweb.podDetails.showLess') : t('mweb.podDetails.readMore')}
            </DuncitButton>
          )}
        </Box>
      ) : (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('mweb.podDetails.aboutEmpty')}
        </Typography>
      )}
      {info && (
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block'
            }}>
            {t('mweb.podDetails.whatToExpect')}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {info}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
