import { Box } from '@mui/material';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';

import { StoreImage } from '../../../components/StoreImage';
import { STORE_TOKENS as T } from '../../../theme/tokens';

interface ItemIconProps {
  src: string;
  /** The round plate's diameter; the picture sits in a fixed box inside it. */
  plate: number;
  icon: number;
}

/**
 * An operator's point icon on a round plate. Any upload size renders in the
 * same fixed box (`contain`), so a row of them looks uniform; without one, a
 * neutral paw. Decorative: the point's title carries the meaning.
 */
export function ItemIcon({ src, plate, icon }: Readonly<ItemIconProps>) {
  return (
    <Box aria-hidden sx={{ width: plate, height: plate, borderRadius: '50%', bgcolor: T.brandTint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {src ? (
        <Box sx={{ width: icon, height: icon }}>
          <StoreImage src={src} alt="" width={icon} height={icon} sx={{ width: icon, height: icon, objectFit: 'contain' }} />
        </Box>
      ) : (
        <PetsRoundedIcon sx={{ fontSize: icon * 0.8, color: T.ink }} />
      )}
    </Box>
  );
}
