import { useState } from 'react';
import { Box } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';

import { useStoreSettings } from '../app/providers/StoreSettingsProvider';
import { STORE_FALLBACK_ICONS } from '../fallback-icons';

/**
 * The store's logo from settings. A blank field or a URL that fails at request
 * time both fall back to the bundled mark (rule 39) — the `onError` flag is
 * what catches a 404, which never arrives as an empty string.
 */
export function StoreLogo({ height = 40 }: Readonly<{ height?: number }>) {
  const { logo_url: logoUrl, store_name: storeName } = useStoreSettings();
  const [failed, setFailed] = useState(false);
  const { source } = resolveIconSource(logoUrl, STORE_FALLBACK_ICONS.logo, failed);
  return (
    <Box
      component="img"
      src={source}
      alt={storeName}
      height={height}
      width={height}
      onError={() => setFailed(true)}
      sx={{ height, width: 'auto', maxWidth: 160, objectFit: 'contain', display: 'block' }}
    />
  );
}
