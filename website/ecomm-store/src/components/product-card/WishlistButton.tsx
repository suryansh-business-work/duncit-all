import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { DuncitIconButton } from '@duncit/buttons';
import type { SxProps, Theme } from '@mui/material/styles';

import { useWishlist } from '../../app/providers/WishlistProvider';
import { useStoreT } from '../../i18n';

interface WishlistButtonProps {
  productId: string;
  productTitle: string;
  sx?: SxProps<Theme>;
}

/** The heart: a toggle, so it says whether the product is saved (aria-pressed). */
export function WishlistButton({ productId, productTitle, sx }: Readonly<WishlistButtonProps>) {
  const { t } = useStoreT();
  const { ids, toggle } = useWishlist();
  const saved = ids.has(productId);
  return (
    <DuncitIconButton
      aria-pressed={saved}
      aria-label={t('ecommStore.wishlist.toggle', { vars: { name: productTitle } })}
      onClick={() => toggle(productId)}
      sx={sx}
    >
      {saved ? <FavoriteIcon color="secondary" /> : <FavoriteBorderIcon />}
    </DuncitIconButton>
  );
}
