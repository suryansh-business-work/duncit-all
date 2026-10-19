import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { useStoreT } from '../i18n';
import { STORE_TOKENS as T } from '../theme/tokens';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** "View all" target; omitted hides the link. */
  viewAll?: string;
  id?: string;
}

/** A section's bold title and muted line, with an optional "View all →" on the right. */
export function SectionHeading({ title, subtitle, viewAll, id }: Readonly<SectionHeadingProps>) {
  const { t } = useStoreT();
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', justifyContent: 'space-between', mb: { xs: 2, md: 3 } }}>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography id={id} variant="h2" component="h2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {subtitle ? <Typography color="text.secondary">{subtitle}</Typography> : null}
      </Stack>
      {viewAll ? (
        <Link
          component={RouterLink}
          to={viewAll}
          underline="hover"
          aria-label={t('ecommStore.home.viewAllNamed', { vars: { name: title } })}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: T.ctaInk, fontWeight: 800, whiteSpace: 'nowrap', minHeight: 44, flexShrink: 0 }}
        >
          {t('ecommStore.home.viewAll')}
          <ArrowForwardRoundedIcon fontSize="small" aria-hidden />
        </Link>
      ) : null}
    </Stack>
  );
}
