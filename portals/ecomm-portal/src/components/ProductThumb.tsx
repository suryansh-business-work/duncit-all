import { Avatar } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

interface ProductThumbProps {
  src?: string | null;
  size?: number;
}

/**
 * A product's picture beside its name. Decorative — the name next to it is
 * what a screen reader reads — so it carries an empty alt, and an icon stands
 * in when there is no picture.
 */
export default function ProductThumb({ src, size = 40 }: Readonly<ProductThumbProps>) {
  return (
    <Avatar variant="rounded" src={src || undefined} alt="" sx={{ width: size, height: size, bgcolor: 'action.hover' }}>
      <Inventory2OutlinedIcon fontSize="small" color="action" />
    </Avatar>
  );
}
