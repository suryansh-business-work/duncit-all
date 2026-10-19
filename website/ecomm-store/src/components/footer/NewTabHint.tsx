import { Box } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';

import { visuallyHidden } from '../../lib/a11y';
import { useStoreT } from '../../i18n';

/** The mark after a link that leaves the store in a new tab, with the same warning for screen readers. */
export function NewTabHint() {
  const { t } = useStoreT();
  return (
    <>
      <OpenInNewRoundedIcon aria-hidden sx={{ fontSize: '1em', ml: 0.5, verticalAlign: '-0.125em' }} />
      <Box component="span" sx={visuallyHidden}>
        {t('ecommStore.common.opensNewTab')}
      </Box>
    </>
  );
}
