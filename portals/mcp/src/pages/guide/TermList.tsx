import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { GuideTerm } from './guideContent';

/** A list of protocol names, each shown as code with what it means beside it. */
export default function TermList({ terms }: Readonly<{ terms: readonly GuideTerm[] }>) {
  const { t } = useTranslation();
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {terms.map((term) => (
        <Stack key={term.name} spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography component="dt" variant="body2" sx={{ fontWeight: 'fontWeightBold' }}>
            <code>{term.name}</code>
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, color: 'text.secondary' }}>
            {t(term.descriptionKey)}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}
