import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { money } from '../lib/format';
import ProductThumb from './ProductThumb';

interface ProductCardRowProps {
  title: string;
  imageUrl: string;
  /** A second line — the brand, a SKU. */
  caption?: string;
  price: number;
  /** Chips or controls at the end of the row. */
  children?: ReactNode;
}

/** A product in one line: picture, title, a caption, its price, and whatever the row adds. */
export default function ProductCardRow({ title, imageUrl, caption, price, children }: Readonly<ProductCardRowProps>) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      <ProductThumb src={imageUrl} />
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {[caption, money(price)].filter(Boolean).join(' · ')}
        </Typography>
      </Stack>
      {children}
    </Stack>
  );
}
