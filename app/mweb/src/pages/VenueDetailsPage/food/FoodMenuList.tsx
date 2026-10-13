import { Stack, Typography } from '@mui/material';
import type { FoodMenuGroup, VenueFoodItem } from '@duncit/utils';
import FoodItemCard from './FoodItemCard';

interface Props {
  groups: FoodMenuGroup[];
  currency: string;
  canOrder: boolean;
  quantityOf: (itemId: string) => number;
  onQuantity: (itemId: string, quantity: number) => void;
  onOpenImage: (item: VenueFoodItem) => void;
}

/** The menu under its category headings; the dishes with no category follow, under none. */
export default function FoodMenuList({ groups, currency, canOrder, quantityOf, onQuantity, onOpenImage }: Readonly<Props>) {
  return (
    <Stack spacing={2.5} data-testid="food-menu-list">
      {groups.map((group) => (
        <Stack key={group.category || 'uncategorised'} component="section" spacing={1.25} aria-label={group.category || undefined}>
          {group.category && (
            <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700 }}>
              {group.category}
            </Typography>
          )}
          <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {group.items.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                currency={currency}
                canOrder={canOrder}
                quantity={quantityOf(item.id)}
                onQuantity={onQuantity}
                onOpenImage={onOpenImage}
              />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
