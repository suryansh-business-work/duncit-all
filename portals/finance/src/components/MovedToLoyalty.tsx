import { useEffect } from 'react';
import { Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { urlConfigs } from '../config/url-configs';

/**
 * Duncit Coin and gift cards moved to the Loyalty console. An old Finance
 * bookmark lands here and is sent on to the same screen there; the link is for
 * the moment before the browser follows, and for anyone whose browser does not.
 */
export default function MovedToLoyalty({ to }: Readonly<{ to: string }>) {
  const { t } = useTranslation();
  const target = `${urlConfigs.loyaltyUrl}${to}`;

  useEffect(() => {
    globalThis.location.replace(target);
  }, [target]);

  return (
    <Stack spacing={1} sx={{ p: 3 }} role="status">
      <Typography variant="body1">{t('finance.common.movedToLoyalty')}</Typography>
      <Link href={target}>{t('finance.common.openLoyalty')}</Link>
    </Stack>
  );
}
