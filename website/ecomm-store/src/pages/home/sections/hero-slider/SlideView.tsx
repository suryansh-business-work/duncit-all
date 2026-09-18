import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { Link as RouterLink } from 'react-router';
import { StoreImage } from '../../../../components/StoreImage';
import type { StoreSectionItem } from '../../../../graphql/catalog';
import { isInternalLink } from '../../../../lib/paths';
import { STORE_TOKENS as T } from '../../../../theme/tokens';

/** One hero slide: the picture (a phone crop on small screens), words, and its call to action. */
export function SlideView({ item, eager }: Readonly<{ item: StoreSectionItem; eager: boolean }>) {
  const mobileImage = item.mobile_image_url || item.image_url;
  const external = item.link && !isInternalLink(item.link);
  return (
    <Box sx={{ position: 'relative', borderRadius: `${T.radius.card}px`, overflow: 'hidden', bgcolor: T.brandTint }}>
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        <StoreImage src={mobileImage} alt="" width={640} height={640} eager={eager} />
      </Box>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <StoreImage src={item.image_url} alt="" width={1200} height={480} eager={eager} />
      </Box>
      <Stack
        spacing={1}
        sx={{
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          p: { xs: 2, md: 4 },
          background: 'linear-gradient(to top, rgba(21,21,21,0.72), rgba(21,21,21,0))',
          color: T.onBrand,
        }}
      >
        {item.title ? (
          <Typography variant="h2" component="p" sx={{ color: 'inherit' }}>
            {item.title}
          </Typography>
        ) : null}
        {item.subtitle ? <Typography sx={{ color: 'inherit' }}>{item.subtitle}</Typography> : null}
        {item.cta_label && item.link ? (
          <Box>
            {external ? (
              <DuncitButton variant="contained" href={item.link} target="_blank" rel="noopener noreferrer">
                {item.cta_label}
              </DuncitButton>
            ) : (
              <DuncitButton variant="contained" component={RouterLink} to={item.link}>
                {item.cta_label}
              </DuncitButton>
            )}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
