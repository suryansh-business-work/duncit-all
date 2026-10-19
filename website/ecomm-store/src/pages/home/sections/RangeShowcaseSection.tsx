import { Box, Stack, Typography } from '@mui/material';

import { SectionHeading } from '../../../components/SectionHeading';
import { StoreImage } from '../../../components/StoreImage';
import type { StoreSectionItem } from '../../../graphql/catalog';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../../theme/tokens';
import { CtaPill } from './CtaPill';
import type { SectionProps } from './types';

/** One big range card: words and a pill on a tint-to-brand-tint wash, the picture filling the right half. */
function RangeCard({ item, position }: Readonly<{ item: StoreSectionItem; position: number }>) {
  const { t } = useStoreT();
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        minHeight: 260,
        height: '100%',
        borderRadius: `${T.radius.card}px`,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${tintAt(position)} 0%, ${T.brandTint} 100%)`,
      }}
    >
      <Stack spacing={1.5} sx={{ p: { xs: 2.5, md: 4 }, justifyContent: 'center', minWidth: 0 }}>
        {item.eyebrow ? (
          <Typography variant="overline" component="p" sx={{ color: T.ctaInk, lineHeight: 1.4 }}>
            {item.eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h2" component="h3" sx={{ fontWeight: 800 }}>
          {item.title}
        </Typography>
        {item.subtitle ? <Typography color="text.secondary">{item.subtitle}</Typography> : null}
        {item.link ? (
          <Box sx={{ pt: 0.5 }}>
            <CtaPill label={item.cta_label || t('ecommStore.home.shopNow')} link={item.link} />
          </Box>
        ) : null}
      </Stack>
      <Box sx={{ position: 'relative', minWidth: 0 }}>
        <StoreImage
          src={item.image_url}
          alt=""
          width={480}
          height={520}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', aspectRatio: 'auto', objectFit: 'cover' }}
        />
      </Box>
    </Box>
  );
}

/** RANGE_SHOWCASE — "Explore Our Range": two big cards side by side, stacked on a phone. */
export function RangeShowcaseSection({ section }: Readonly<SectionProps>) {
  if (section.items.length === 0) return null;
  return (
    <Box component="section" aria-label={section.title || undefined}>
      {section.title ? <SectionHeading title={section.title} subtitle={section.subtitle} /> : null}
      <Box
        component="ul"
        sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' } }}
      >
        {section.items.map((item, position) => (
          <Box component="li" key={item.id}>
            <RangeCard item={item} position={position} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
