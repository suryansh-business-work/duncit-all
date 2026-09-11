import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  title: string;
  /** Renders the 40px round back button before the title (inner pages). */
  onBack?: () => void;
  /** Optional right-hand slot (a chip or a round action). */
  right?: ReactNode;
}

const BACK_SX = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
} as const;

/**
 * A page's title row: a 20/600 page title, or — on an inner page — a round
 * back button with a 17/600 title, the same bar the native StackScreen draws.
 * No subtitles under it.
 */
export default function PageHeader({ title, onBack, right }: Readonly<Props>) {
  const { t } = useTranslation();
  const fontSize = onBack ? '1.0625rem' : '1.25rem';
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minHeight: 44 }}>
      {onBack ? (
        <DuncitRoundButton aria-label={t('mweb.common.goBack')} onClick={onBack} sx={BACK_SX}>
          <ArrowBackIcon />
        </DuncitRoundButton>
      ) : null}
      <Typography component="h1" noWrap sx={{ flex: 1, minWidth: 0, fontSize, fontWeight: 600 }}>
        {title}
      </Typography>
      {right}
    </Stack>
  );
}
