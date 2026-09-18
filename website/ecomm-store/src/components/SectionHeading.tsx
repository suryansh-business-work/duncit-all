import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import { useStoreT } from '../i18n';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** "View all" target; omitted hides the link. */
  viewAll?: string;
  id?: string;
}

/** A section's title with an optional "View all ›" on the right. */
export function SectionHeading({ title, subtitle, viewAll, id }: Readonly<SectionHeadingProps>) {
  const { t } = useStoreT();
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', justifyContent: 'space-between', mb: 1.5 }}>
      <Stack spacing={0.25}>
        <Typography id={id} variant="h3" component="h2">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      {viewAll ? (
        <Link
          component={RouterLink}
          to={viewAll}
          color="text.secondary"
          aria-label={t('ecommStore.home.viewAllNamed', { vars: { name: title } })}
          sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, whiteSpace: 'nowrap', minHeight: 44 }}
        >
          {t('ecommStore.home.viewAll')}
          <ChevronRightRoundedIcon fontSize="small" aria-hidden />
        </Link>
      ) : null}
    </Stack>
  );
}
