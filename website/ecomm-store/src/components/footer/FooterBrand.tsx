import { Stack, Typography } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { StoreLogo } from '../StoreLogo';
import { SocialLinks } from './SocialLinks';

/** The footer's first column: the logo, the operator's tagline and the social links. */
export function FooterBrand() {
  const { tagline, social_links: socialLinks } = useStoreSettings();
  return (
    <Stack spacing={2} sx={{ minWidth: 0, gridColumn: { sm: '1 / -1', md: 'auto' } }}>
      <StoreLogo height={48} />
      {tagline ? (
        <Typography color="text.secondary" sx={{ maxWidth: 320 }}>
          {tagline}
        </Typography>
      ) : null}
      <SocialLinks links={socialLinks} />
    </Stack>
  );
}
