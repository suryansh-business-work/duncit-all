import { Avatar, Chip, Stack } from '@mui/material';

import type { StoreCategoryTile } from '../../graphql/catalog';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

interface PetCategoryChipsProps {
  petName: string;
  categories: StoreCategoryTile[];
  /** The slug of the aisle in force; '' when every aisle shows. */
  selected: string;
  /** Toggle an aisle — the same slug again clears it. */
  onSelect: (slug: string) => void;
}

const chipSx = (selected: boolean) => ({
  minHeight: 40,
  height: 'auto',
  borderRadius: T.radius.pill,
  fontWeight: 700,
  px: 0.5,
  bgcolor: selected ? T.navBar : T.surface,
  color: selected ? T.onBrand : T.ink,
  border: 1,
  borderColor: selected ? T.navBar : T.border,
  '&:hover': { bgcolor: selected ? T.navBar : T.surface },
  '& .MuiChip-label': { py: 1 },
});

/** One pet's aisles as a scrolling row of chips: "All" first, the chosen one drawn dark. */
export function PetCategoryChips({ petName, categories, selected, onSelect }: Readonly<PetCategoryChipsProps>) {
  const { t } = useStoreT();
  const none = selected === '';
  return (
    <Stack
      component="ul"
      direction="row"
      spacing={1}
      aria-label={t('ecommStore.shelf.categoriesFor', { vars: { pet: petName } })}
      sx={{ listStyle: 'none', p: 0, m: 0, overflowX: 'auto', pb: 0.5 }}
      data-testid="pet-category-chips"
    >
      <Stack component="li" sx={{ flexShrink: 0 }}>
        <Chip
          clickable
          label={t('ecommStore.shelf.allCategories')}
          aria-pressed={none}
          onClick={() => onSelect(selected)}
          sx={chipSx(none)}
          data-testid="pet-category-chip-all"
        />
      </Stack>
      {categories.map((category) => {
        const on = category.slug === selected;
        return (
          <Stack component="li" key={category.id} sx={{ flexShrink: 0 }}>
            <Chip
              clickable
              label={category.name}
              aria-pressed={on}
              onClick={() => onSelect(category.slug)}
              avatar={category.image_url ? <Avatar src={category.image_url} alt="" /> : undefined}
              sx={chipSx(on)}
              data-testid={`pet-category-chip-${category.id}`}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}
