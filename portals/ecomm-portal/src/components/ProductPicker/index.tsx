import { useMemo, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { FormHelperText, List, ListItem, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { moveId, type MoveDirection } from '../../lib/reorder';
import { PICKER_PRODUCTS, type PickerSearchRow } from '../../queries/products';
import MoveButtons from '../MoveButtons';
import ProductCardRow from '../ProductCardRow';
import ProductSearch from './ProductSearch';
import ProductStrip, { type PickedProduct } from './ProductStrip';

interface ProductPickerProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the picked product ids, in the order the store shows them. */
  name: Path<T>;
  /** How many the list may hold. */
  max: number;
  /** Also show the picks side by side, as a slider would. */
  withStrip?: boolean;
}

/**
 * Hand-picked products, in order: search the catalogue to add, then move or
 * remove. A product just added reads from its search result until the
 * server's own card for it arrives.
 */
export default function ProductPicker<T extends FieldValues>({ control, name, max, withStrip }: Readonly<ProductPickerProps<T>>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name });
  const ids: string[] = Array.isArray(field.value) ? field.value : [];
  const [found, setFound] = useState<ReadonlyMap<string, PickedProduct>>(new Map());
  const { data, previousData } = useQuery(PICKER_PRODUCTS, { variables: { ids }, skip: ids.length === 0 });
  const cards = (data ?? previousData)?.storeAdminPickerProducts;
  const picked = useMemo(() => {
    const map = new Map(found);
    for (const card of cards ?? []) {
      map.set(card.id, { id: card.id, title: card.title, imageUrl: card.image_url, caption: card.brand_name, price: card.price });
    }
    return ids.map((id) => map.get(id) ?? { id, title: id, imageUrl: '', caption: '', price: 0 });
  }, [found, cards, ids]);
  const chosen = useMemo(() => new Set(ids), [ids]);

  const add = (row: PickerSearchRow) => {
    const entry = { id: row.id, title: row.title || row.product_name, imageUrl: row.image_url, caption: row.brand_name, price: row.price };
    setFound((previous) => new Map(previous).set(row.id, entry));
    field.onChange([...ids, row.id]);
  };
  const move = (id: string, direction: MoveDirection) => {
    const next = moveId(ids, id, direction);
    if (next) field.onChange(next);
  };

  return (
    <Stack spacing={2}>
      <ProductSearch chosen={chosen} full={ids.length >= max} onAdd={add} />
      <Typography component="h3" variant="subtitle2">
        {t('ecommPortal.picker.chosen', { vars: { count: ids.length, max } })}
      </Typography>
      {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
      {withStrip && <ProductStrip products={picked} />}
      {ids.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.picker.noneChosen')}
        </Typography>
      )}
      <List disablePadding aria-label={t('ecommPortal.picker.chosenList')}>
        {picked.map((item, index) => (
          <ListItem key={item.id} divider disableGutters sx={{ display: 'block' }}>
            <ProductCardRow title={item.title} imageUrl={item.imageUrl} caption={item.caption} price={item.price}>
              <MoveButtons
                name={item.title}
                canMoveUp={index > 0}
                canMoveDown={index < picked.length - 1}
                onMoveUp={() => move(item.id, -1)}
                onMoveDown={() => move(item.id, 1)}
              >
                <DuncitIconButton
                  aria-label={t('shell.a11y.removeNamed', { vars: { name: item.title } })}
                  onClick={() => field.onChange(ids.filter((other) => other !== item.id))}
                >
                  <CloseIcon fontSize="small" />
                </DuncitIconButton>
              </MoveButtons>
            </ProductCardRow>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
