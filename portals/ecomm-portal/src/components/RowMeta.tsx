import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface RowMetaProps {
  slug: string;
  active: boolean;
  /** Anything else the row wants said — a count, a mode, a window. */
  children?: ReactNode;
}

/** The line under a filed thing's name: its URL key, and whether it is switched off. */
export default function RowMeta({ slug, active, children }: Readonly<RowMetaProps>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {'/' + slug}
      </Typography>
      {!active && <Chip size="small" variant="outlined" label={t('shell.common.inactive')} />}
      {children}
    </Stack>
  );
}
