import { Link as RouterLink } from 'react-router';
import { Box } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { DuncitButton } from '@duncit/buttons';

import { visuallyHidden } from '../../../lib/a11y';
import { isInternalLink } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';

interface CtaPillProps {
  label: string;
  link: string;
  /** White pill with dark text, for a dark banner (the earn promo). */
  inverse?: boolean;
}

const INVERSE_SX = { bgcolor: T.onBrand, color: T.navBar, '&:hover': { bgcolor: T.onBrand } } as const;

/**
 * A section's call to action: a large contained pill with an arrow. A store
 * path routes in-app; anything else opens in a new tab, cut off from the
 * opener, and says so to a screen reader.
 */
export function CtaPill({ label, link, inverse = false }: Readonly<CtaPillProps>) {
  const { t } = useStoreT();
  const common = {
    variant: 'contained',
    size: 'large',
    endIcon: <ArrowForwardRoundedIcon aria-hidden />,
    sx: { px: 3, ...(inverse ? INVERSE_SX : {}) },
  } as const;
  if (isInternalLink(link)) {
    return (
      <DuncitButton {...common} component={RouterLink} to={link}>
        {label}
      </DuncitButton>
    );
  }
  return (
    <DuncitButton {...common} href={link} target="_blank" rel="noopener noreferrer">
      {label}
      <Box component="span" sx={visuallyHidden}>
        {' '}
        {t('ecommStore.common.newTab')}
      </Box>
    </DuncitButton>
  );
}
