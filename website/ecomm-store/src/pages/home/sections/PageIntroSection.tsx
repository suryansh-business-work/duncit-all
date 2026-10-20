import { Box, Stack, Typography } from '@mui/material';

import { StoreImage } from '../../../components/StoreImage';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { CtaPill } from './CtaPill';
import type { SectionProps } from './types';

/**
 * PAGE_INTRO — a heading block on the hero wash: the first item's eyebrow over
 * the title, the subtitle, its button and picture. When it opens a page with
 * no title of its own (Deals) its title is that page's h1; otherwise an h2.
 */
export function PageIntroSection({ section, pageTitle = false }: Readonly<SectionProps>) {
  const title = section.title.trim();
  if (!title && !section.subtitle.trim()) return null;
  const item = section.items[0];
  const image = item?.image_url ?? '';
  return (
    <Box
      component="section"
      aria-label={title || undefined}
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 4 },
        alignItems: 'center',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: image ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)' },
        background: T.heroGradient,
        borderRadius: `${T.radius.card}px`,
        px: { xs: 2.5, md: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={1.5} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
        {item?.eyebrow ? (
          <Typography variant="overline" component="p" sx={{ color: T.ctaInk, lineHeight: 1.4 }}>
            {item.eyebrow}
          </Typography>
        ) : null}
        {title ? (
          <Typography variant={pageTitle ? 'h1' : 'h2'} component={pageTitle ? 'h1' : 'h2'}>
            {title}
          </Typography>
        ) : null}
        {section.subtitle ? (
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            {section.subtitle}
          </Typography>
        ) : null}
        {item?.cta_label && item.link ? <CtaPill label={item.cta_label} link={item.link} /> : null}
      </Stack>
      {image ? (
        <Box sx={{ borderRadius: `${T.radius.card}px`, overflow: 'hidden', minWidth: 0 }}>
          <StoreImage src={image} alt="" width={640} height={360} eager={pageTitle} sx={{ display: 'block', width: '100%', height: 'auto' }} />
        </Box>
      ) : null}
    </Box>
  );
}
