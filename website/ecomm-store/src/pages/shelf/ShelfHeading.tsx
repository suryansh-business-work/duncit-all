import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';

import { StoreImage } from '../../components/StoreImage';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

export interface Crumb {
  label: string;
  to: string;
}

interface ShelfHeadingProps {
  title: string;
  description?: string;
  banner?: string;
  crumbs?: Crumb[];
  /** Extra content under the title — sub-category chips. */
  children?: ReactNode;
  /** Only the trail: the page draws its own title (a product page). */
  breadcrumbsOnly?: boolean;
}

/** A shelf's title block: breadcrumbs, a banner when there is one, the name and blurb. */
export function ShelfHeading({ title, description, banner, crumbs = [], children, breadcrumbsOnly = false }: Readonly<ShelfHeadingProps>) {
  const { t } = useStoreT();
  return (
    <Stack spacing={1.5}>
      {crumbs.length > 0 ? (
        <Breadcrumbs aria-label={t('ecommStore.shelf.breadcrumbs')}>
          <Link component={RouterLink} to={paths.home} color="text.secondary">
            {t('ecommStore.nav.home')}
          </Link>
          {crumbs.map((crumb) => (
            <Link key={crumb.to} component={RouterLink} to={crumb.to} color="text.secondary">
              {crumb.label}
            </Link>
          ))}
          <Typography color="text.primary" aria-current="page">
            {title}
          </Typography>
        </Breadcrumbs>
      ) : null}
      {breadcrumbsOnly ? null : (
        <ShelfTitle title={title} description={description} banner={banner}>
          {children}
        </ShelfTitle>
      )}
    </Stack>
  );
}

function ShelfTitle({ title, description, banner, children }: Readonly<Omit<ShelfHeadingProps, 'crumbs' | 'breadcrumbsOnly'>>) {
  return (
    <>
      {banner ? (
        <Box sx={{ borderRadius: `${T.radius.card}px`, overflow: 'hidden' }}>
          <StoreImage src={banner} alt="" width={1200} height={300} eager />
        </Box>
      ) : null}
      <Typography variant="h1">{title}</Typography>
      {description ? <Typography color="text.secondary">{description}</Typography> : null}
      {children}
    </>
  );
}
