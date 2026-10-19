import { useId } from 'react';
import { Box, Stack, Typography } from '@mui/material';

import type { StorePaymentBadge } from '../../graphql/settings';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

const BADGE_HEIGHT = 26;

/** "We accept" and the payment marks the operator uploaded; nothing when there are none. */
export function PaymentBadges({ badges }: Readonly<{ badges: StorePaymentBadge[] }>) {
  const { t } = useStoreT();
  const labelId = useId();
  const shown = badges.filter((badge) => badge.image_url);
  if (shown.length === 0) return null;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
      <Typography id={labelId} variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
        {t('ecommStore.footer.weAccept')}
      </Typography>
      <Stack component="ul" direction="row" aria-labelledby={labelId} sx={{ listStyle: 'none', m: 0, p: 0, gap: 1, flexWrap: 'wrap' }}>
        {shown.map((badge) => (
          <Box
            component="li"
            key={`${badge.label}-${badge.image_url}`}
            sx={{ display: 'grid', placeItems: 'center', px: 1, py: 0.5, bgcolor: T.surface, border: 1, borderColor: T.border, borderRadius: 1 }}
          >
            <Box
              component="img"
              src={badge.image_url}
              alt={badge.label}
              height={BADGE_HEIGHT}
              loading="lazy"
              decoding="async"
              sx={{ height: BADGE_HEIGHT, width: 'auto', maxWidth: 72, objectFit: 'contain', display: 'block' }}
            />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
