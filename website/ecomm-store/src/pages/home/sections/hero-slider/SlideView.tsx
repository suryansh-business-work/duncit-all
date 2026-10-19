import { Box, Stack, Typography } from '@mui/material';

import { StoreImage } from '../../../../components/StoreImage';
import type { StoreSectionItem } from '../../../../graphql/catalog';
import { STORE_TOKENS as T } from '../../../../theme/tokens';
import { CtaPill } from '../CtaPill';
import { TrustRow } from './TrustRow';

interface SlideViewProps {
  item: StoreSectionItem;
  eager: boolean;
  trust: readonly StoreSectionItem[];
}

/**
 * One hero slide: a large rounded card on the hero gradient — the words and
 * call to action on the left, the picture on the right (under the words, in
 * its phone crop, on a phone). The page's one h1 lives elsewhere, so a slide's
 * title is an h2 at display size.
 */
export function SlideView({ item, eager, trust }: Readonly<SlideViewProps>) {
  const mobileImage = item.mobile_image_url || item.image_url;
  return (
    <Box
      sx={{
        background: T.heroGradient,
        borderRadius: `${T.radius.card}px`,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' },
        alignItems: 'center',
        gap: { xs: 2, md: 4 },
        minHeight: { md: 440 },
        pl: { xs: 2.5, md: 9 },
        pr: { xs: 2.5, md: 9 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        {item.eyebrow ? (
          <Typography variant="overline" component="p" sx={{ color: T.ctaInk }}>
            {item.eyebrow}
          </Typography>
        ) : null}
        {item.title ? (
          <Typography variant="h1" component="h2" sx={{ fontWeight: 800 }}>
            {item.title}
          </Typography>
        ) : null}
        {item.subtitle ? (
          <Typography color="text.secondary" sx={{ fontSize: { md: '1.125rem' }, maxWidth: 520 }}>
            {item.subtitle}
          </Typography>
        ) : null}
        {item.cta_label && item.link ? (
          <Box>
            <CtaPill label={item.cta_label} link={item.link} />
          </Box>
        ) : null}
        <TrustRow items={trust} />
      </Stack>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
          {/* Natural aspect once loaded (the attributes only reserve space), so a wide picture leaves no empty band. */}
          <StoreImage src={mobileImage} alt="" width={640} height={520} eager={eager} sx={{ objectFit: 'contain', aspectRatio: 'auto' }} />
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <StoreImage src={item.image_url} alt="" width={720} height={560} eager={eager} sx={{ objectFit: 'contain', aspectRatio: 'auto' }} />
        </Box>
      </Box>
    </Box>
  );
}
