import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { ReadOnlyContextItem } from '../types';

/** The pod's fixed facts (date, place, amount…), shown above the editable fields. */
export function ReadOnlyContext({ items }: Readonly<{ items: ReadOnlyContextItem[] }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 800
        }}>
        {t('shell.podContent.readOnlyHeading')}
      </Typography>
      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
        {items.map((item) => (
          <Typography key={item.label} variant="body2">
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {item.label}:{' '}
            </Box>
            {item.value}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}
