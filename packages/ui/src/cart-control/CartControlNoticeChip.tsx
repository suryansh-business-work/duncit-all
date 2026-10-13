import { Chip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { CartControlLabels, CartControlNotice } from '@duncit/utils';
import { mergeSx } from '../mergeSx';
import { noticeSx } from './styles';

export interface CartControlNoticeChipProps {
  /** What `useCartControlNotice` returned — `null` between notices. */
  notice: CartControlNotice | null;
  /** The surface's translated copy; only `added` and `removed` are read. */
  labels: Pick<CartControlLabels, 'added' | 'removed'>;
  testId?: string;
  /** Where on the card it sits. The default is top-centre of a `position: relative` parent. */
  sx?: SxProps<Theme>;
}

/**
 * The short dark notice over a product card's image: "Item added", "Item removed".
 *
 * It stays mounted, empty and invisible, between notices. A live region that is
 * inserted already holding its text is routinely not announced; one that is
 * there first and then gains text is — so a screen reader hears the notice a
 * sighted shopper sees.
 */
export function CartControlNoticeChip({
  notice,
  labels,
  testId,
  sx,
}: Readonly<CartControlNoticeChipProps>) {
  return (
    <Chip
      role="status"
      size="small"
      label={notice ? labels[notice] : ''}
      data-testid={testId}
      sx={mergeSx(noticeSx(notice !== null), sx)}
    />
  );
}
